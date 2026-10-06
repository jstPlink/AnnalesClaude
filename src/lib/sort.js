// Ordina per nome (italiano, senza distinguere maiuscole/accenti) una copia
// dell'elenco: per tag e luoghi, così si trovano più in fretta.
export function sortByName(list) {
  return [...list].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'it', { sensitivity: 'base' }),
  )
}
