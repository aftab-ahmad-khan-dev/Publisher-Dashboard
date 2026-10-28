const ACCEPT = '.csv,.txt,.tsv,text/csv,text/plain'

export const RECIPIENT_FILE_ACCEPT = ACCEPT

export function readRecipientFile(file) {
  return new Promise((resolve, reject) => {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.txt') && !name.endsWith('.tsv')) {
      reject(new Error('Use a .csv, .txt, or .tsv file'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve({ text: String(reader.result || ''), fileName: file.name })
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
