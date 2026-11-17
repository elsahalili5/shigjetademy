/** Gives the browser time to start the download before the blob's address is let go */
const REVOKE_DELAY_MS = 1000

type SaveFileParams = {
  blob: Blob
  fileName: string
}

/** Saves a fetched file under its name, through a link that is clicked once and never shown */
export const saveFile = ({ blob, fileName }: SaveFileParams) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
