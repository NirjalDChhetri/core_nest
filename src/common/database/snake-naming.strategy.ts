import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/**
 * Converts all camelCase entity property names to snake_case DB column names.
 *
 * Entity properties stay idiomatic TypeScript (camelCase),
 * while the database uses PostgreSQL convention (snake_case).
 */
export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/^_/, '')
      .toLowerCase();
  }

  tableName(className: string, customName: string): string {
    return customName ?? this.toSnakeCase(className);
  }

  columnName(
    propertyName: string,
    customName: string,
    embeddedPrefixes: string[],
  ): string {
    const name = customName ?? propertyName;
    const prefix = embeddedPrefixes.length
      ? embeddedPrefixes.map((p) => this.toSnakeCase(p)).join('_') + '_'
      : '';
    return prefix + this.toSnakeCase(name);
  }

  relationName(propertyName: string): string {
    return this.toSnakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.toSnakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(
    firstTableName: string,
    _secondTableName: string,
    firstPropertyName: string,
  ): string {
    return `${firstTableName}_${this.toSnakeCase(firstPropertyName)}`;
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return `${tableName}_${this.toSnakeCase(columnName ?? propertyName)}`;
  }
}
