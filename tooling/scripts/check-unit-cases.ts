import { join } from "node:path";
import {
  AstNodeType,
  CaseFactory,
  CasePolarity,
  Glyph,
  MessageId,
  MIN_CASES_PER_POLARITY,
  PLATFORM_SCOPE,
  PRODUCT_AREA_ALIASES,
  PRODUCT_AREA_PATTERN,
  Separator,
  STRUCTURE_PARSER_LANG,
  Text,
  UNIT_DEBT_FILE,
  UNIT_FUNCTION,
  UNIT_SOURCE_EXCLUDED,
  UNIT_SOURCE_GLOBS,
  UNIT_TEST_GLOB,
  UnitRule,
} from "@platform/constants";
import { message } from "@platform/messages";
import { everyAsync, filterAsync, findAsync, flatMapAsync } from "@platform/store";
import {
  type AstNode,
  type SourceFile,
  type UnitCoverage,
  UnitDebtSchema,
  type UnitRef,
  type UnitViolation,
} from "@platform/types";
import { all } from "@platform/util";
import { parse } from "oxc-parser";
import { childrenOf } from "./ast.ts";
import { readSources } from "./source-files.ts";
import { REPO_ROOT } from "./tools.ts";

const ARGUMENT_SUBJECT = 0;
const ARGUMENT_SUITE = 1;
const FACTORY_NAMES: readonly string[] = Object.values(CaseFactory);
const SUITE_KEYS: readonly string[] = Object.values(CasePolarity);

async function nameOf(node: AstNode | undefined): Promise<string | undefined> {
  return node?.type === AstNodeType.Identifier ? (node.name as string) : undefined;
}

async function descendants(node: AstNode): Promise<AstNode[]> {
  return [node, ...(await flatMapAsync(await childrenOf(node), descendants))];
}

async function programOf(file: string, text: string): Promise<AstNode> {
  const parsed = await parse(file, text, { lang: STRUCTURE_PARSER_LANG });
  return parsed.program as unknown as AstNode;
}

export async function areaOf(path: string): Promise<string | undefined> {
  if (path.startsWith(PLATFORM_SCOPE)) {
    return path.slice(PLATFORM_SCOPE.length).split(Separator.Resource)[0];
  }
  const area = PRODUCT_AREA_PATTERN.exec(path.replace(/^(\.\.\/)+/, Text.Empty))?.[0];
  return area === undefined
    ? undefined
    : (PRODUCT_AREA_ALIASES[area] ?? area.split(Separator.Resource)[1]);
}

async function declared(statement: AstNode): Promise<string[]> {
  const declaration = statement.declaration as AstNode | undefined;
  if (declaration?.type === AstNodeType.FunctionDeclaration) {
    return [(declaration.id as AstNode).name as string];
  }
  const declarators = (declaration?.declarations as AstNode[] | undefined) ?? [];
  return all(
    declarators
      .filter((item) =>
        [AstNodeType.ArrowFunction, AstNodeType.FunctionExpression].includes(
          (item.init as AstNode | null)?.type as AstNodeType,
        ),
      )
      .map((item) => async () => (await nameOf(item.id as AstNode)) as string),
  );
}

export async function unitsOf(source: SourceFile): Promise<UnitRef[]> {
  const program = await programOf(source.file, source.text);
  const area = (await areaOf(source.file)) as string;
  return (
    await flatMapAsync(
      (program.body as AstNode[]).filter((statement) => statement.type === AstNodeType.ExportNamed),
      declared,
    )
  ).map((name) => ({ area, name, file: source.file }));
}

async function importAreas(program: AstNode): Promise<Map<string, string>> {
  const entries = await flatMapAsync(
    (program.body as AstNode[]).filter((statement) => statement.type === AstNodeType.Import),
    async (statement) => {
      const area = await areaOf((statement.source as AstNode).value as string);
      const specifiers = (statement.specifiers as AstNode[]) ?? [];
      return area === undefined
        ? []
        : await all(
            specifiers.map(
              (specifier) => async (): Promise<[string, string]> => [
                (await nameOf(specifier.local as AstNode)) as string,
                area,
              ],
            ),
          );
    },
  );
  return new Map(entries);
}

async function elementsOf(suite: AstNode, key: string): Promise<AstNode[]> {
  const property = await findAsync(
    suite.properties as AstNode[],
    async (item) => (await nameOf(item.key as AstNode)) === key,
  );
  return ((property?.value as AstNode | undefined)?.elements as AstNode[] | undefined) ?? [];
}

async function factoryBuilt(element: AstNode): Promise<boolean> {
  return (
    element.type === AstNodeType.Call &&
    FACTORY_NAMES.includes((await nameOf(element.callee as AstNode)) ?? Text.Empty)
  );
}

export async function casesOf(source: SourceFile): Promise<UnitCoverage[]> {
  const program = await programOf(source.file, source.text);
  const areas = await importAreas(program);
  return await flatMapAsync(
    await filterAsync(
      await descendants(program),
      async (node) =>
        node.type === AstNodeType.Call && (await nameOf(node.callee as AstNode)) === UNIT_FUNCTION,
    ),
    async (call) => {
      const args = call.arguments as AstNode[];
      const name = await nameOf(args[ARGUMENT_SUBJECT]);
      const suite = args[ARGUMENT_SUITE];
      const area = areas.get(name ?? Text.Empty);
      if (name === undefined || area === undefined || suite?.type !== AstNodeType.Object) {
        return [];
      }
      const [positive, negative] = await all(
        SUITE_KEYS.map((key) => async () => elementsOf(suite, key)),
      );
      return [
        {
          area,
          name,
          positive: positive?.length ?? 0,
          negative: negative?.length ?? 0,
          factoryBuilt: await everyAsync([...(positive ?? []), ...(negative ?? [])], factoryBuilt),
          file: source.file,
        },
      ];
    },
  );
}

async function violation(unit: UnitRef, rule: UnitRule, detail: string): Promise<UnitViolation> {
  return { unit: [unit.area, unit.name].join(Separator.Resource), file: unit.file, rule, detail };
}

export async function unitCaseViolations(
  units: readonly UnitRef[],
  cases: readonly UnitCoverage[],
  debt: readonly string[] = [],
): Promise<UnitViolation[]> {
  const labels = units.map((unit) => [unit.area, unit.name].join(Separator.Resource));
  const failing = await flatMapAsync(units, async (unit) => {
    const own = cases.filter((item) => item.area === unit.area && item.name === unit.name);
    const positive = own.reduce((sum, item) => sum + item.positive, 0);
    const negative = own.reduce((sum, item) => sum + item.negative, 0);
    return [
      ...(own.length === 0 ? [await violation(unit, UnitRule.MissingCases, Text.Empty)] : []),
      ...(own.length > 0 && positive < MIN_CASES_PER_POLARITY
        ? [await violation(unit, UnitRule.TooFewPositive, `${positive}`)]
        : []),
      ...(own.length > 0 && negative < MIN_CASES_PER_POLARITY
        ? [await violation(unit, UnitRule.TooFewNegative, `${negative}`)]
        : []),
      ...(own.some((item) => !item.factoryBuilt)
        ? [await violation(unit, UnitRule.NotFactoryBuilt, Text.Empty)]
        : []),
    ];
  });
  const owing = new Set(failing.map((item) => item.unit));
  const unpaid = failing.filter((item) => !debt.includes(item.unit));
  const stale = debt
    .filter((label) => !owing.has(label) || !labels.includes(label))
    .map((label) => ({
      unit: label,
      file: UNIT_DEBT_FILE,
      rule: UnitRule.StaleDebt,
      detail: Text.Empty,
    }));
  return [...unpaid, ...stale];
}

export async function productUnits(root: string = REPO_ROOT): Promise<UnitRef[]> {
  const sources = await readSources(UNIT_SOURCE_GLOBS, root);
  const kept = sources.filter(
    (source) => !UNIT_SOURCE_EXCLUDED.some((pattern) => pattern.test(source.file)),
  );
  return (await all(kept.map((item) => async () => unitsOf(item)))).flat();
}

export async function suiteCases(root: string = REPO_ROOT): Promise<UnitCoverage[]> {
  const sources = await readSources([UNIT_TEST_GLOB], root);
  return (await all(sources.map((item) => async () => casesOf(item)))).flat();
}

export async function unitDebt(root: string = REPO_ROOT): Promise<string[]> {
  const file = Bun.file(join(root, UNIT_DEBT_FILE));
  return (await file.exists()) ? UnitDebtSchema.parse(await file.json()) : [];
}

export async function checkUnitCases(root: string = REPO_ROOT): Promise<number> {
  const units = await productUnits(root);
  const debt = await unitDebt(root);
  const violations = await unitCaseViolations(units, await suiteCases(root), debt);
  for (const item of violations) {
    console.error(
      message(MessageId.UnitCasesViolation, {
        unit: item.unit,
        file: item.file,
        detail: [item.rule, item.detail].join(Glyph.Space).trim(),
      }),
    );
  }
  console.log(
    violations.length === 0
      ? message(MessageId.UnitCasesOk, {
          count: units.length,
          min: MIN_CASES_PER_POLARITY,
          debt: debt.length,
        })
      : message(MessageId.StructureSummary, { count: violations.length }),
  );
  return violations.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await checkUnitCases());
