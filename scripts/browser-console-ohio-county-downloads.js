// Paste the async IIFE below into DevTools Console on the Ohio SOS
// "County Voter Files" page (county table visible). See repo comment in download script or readme.

(async function downloadOhioCountyVoterFilesSequentially(options) {
  const delayMs = options.delayMs ?? 2500
  const selector =
    options.selector ??
    'table.t-Report-report a.product-name[href*="P2_PRODUCT_NUMBER"]'

  window.__ohCountyDlCancel = false

  const links = [...document.querySelectorAll(selector)]
  if (links.length === 0) {
    console.warn(
      'No links matched. Make sure the County Voter Files table is visible, then try again.',
    )
    return
  }

  console.log(
    `Starting ${links.length} downloads (~${delayMs}ms apart). Set window.__ohCountyDlCancel = true to stop.`,
  )

  for (let i = 0; i < links.length; i++) {
    if (window.__ohCountyDlCancel) {
      console.warn('Cancelled before', links[i]?.textContent?.trim() || i + 1)
      break
    }
    const a = links[i]
    const label = (a.textContent || '').trim() || `row ${i + 1}`
    console.log(`[${i + 1}/${links.length}] ${label}`)
    a.click()
    if (i < links.length - 1) {
      await new Promise(function (resolve) {
        setTimeout(resolve, delayMs)
      })
    }
  }

  console.log('Finished click queue (downloads may still be running).')
})({ delayMs: 2500 })

/*
Steps:
1. Open https://www6.ohiosos.gov (voter file download) and select "County Voter Files".
2. Ensure the county table (ADAMS … WYANDOT) is on screen.
3. Open DevTools → Console, paste everything from "(async function" through "})({ delayMs: 2500 })"
   (you can omit the // comments at the top of this file if you prefer).
4. If the browser asks to allow multiple downloads, choose Allow.

Adjust delay: change `2500` to e.g. `4000` if downloads are skipped; lower if your browser queues fast.

Cancel mid-run: window.__ohCountyDlCancel = true
*/
