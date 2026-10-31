type Person = {
  first_name: string
  last_name: string
}

/** "Elsa Halili" */
export const fullName = (person: Person) => `${person.first_name} ${person.last_name}`
