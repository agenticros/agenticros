/**
 * Lightweight JSON Schema builder for the OpenClaw adapter.
 *
 * This intentionally implements only the subset of the TypeBox `Type`
 * API used by AgenticROS. It avoids loading @sinclair/typebox at runtime,
 * which causes severe OpenClaw gateway startup stalls.
 */

export type Schema = Record<string, any>;
type Options = Record<string, any>;

const optionalSymbol = Symbol("agenticros.optional");

type OptionalSchema = Schema & {
  [optionalSymbol]?: true;
};

function withOptions(schema: Schema, options: Options = {}): Schema {
  return { ...schema, ...options };
}

export const Type = {
  String(options: Options = {}): Schema {
    return withOptions({ type: "string" }, options);
  },

  Number(options: Options = {}): Schema {
    return withOptions({ type: "number" }, options);
  },

  Boolean(options: Options = {}): Schema {
    return withOptions({ type: "boolean" }, options);
  },

  Unknown(options: Options = {}): Schema {
    return withOptions({}, options);
  },

  Literal(value: string | number | boolean, options: Options = {}): Schema {
    return withOptions({ const: value }, options);
  },

  Array(items: Schema, options: Options = {}): Schema {
    return withOptions(
      {
        type: "array",
        items,
      },
      options,
    );
  },

  Union(schemas: Schema[], options: Options = {}): Schema {
    return withOptions(
      {
        anyOf: schemas,
      },
      options,
    );
  },

  Optional(schema: Schema): OptionalSchema {
    Object.defineProperty(schema, optionalSymbol, {
      value: true,
      enumerable: false,
      configurable: true,
    });

    return schema as OptionalSchema;
  },

  Object(properties: Record<string, OptionalSchema>, options: Options = {}): Schema {
    const required = Object.entries(properties)
      .filter(([, schema]) => !schema?.[optionalSymbol])
      .map(([name]) => name);

    const schema: Schema = {
      type: "object",
      properties,
    };

    if (required.length > 0) {
      schema.required = required;
    }

    return withOptions(schema, options);
  },

  Record(
    _key: Schema,
    value: Schema,
    options: Options = {},
  ): Schema {
    return withOptions(
      {
        type: "object",
        additionalProperties: value,
      },
      options,
    );
  },
};
