export function searchTerm(value:string){return value.trim().slice(0,120);}
export function searchPattern(value:string){return `%${searchTerm(value).replace(/[\\%_]/g,'\\$&')}%`;}
// Quote OR values so commas and parentheses remain literal search text.
export function searchFilter(columns:string[],value:string){const pattern=JSON.stringify(searchPattern(value));return columns.map(column=>`${column}.ilike.${pattern}`).join(',');}
