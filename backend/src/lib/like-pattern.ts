/** Prisma's `contains` and insensitive `equals` compile to LIKE, so % and _ must be escaped to mean themselves */
export const escapeLike = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`)
