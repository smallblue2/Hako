const consoleOutput = false;

export function showConsole(page) {
  if (consoleOutput) {
    page.on('console', (msg) => {
      console.log(`Console message: ${msg.type()} - ${msg.text()}`);
    });
  }
}

export async function waitCustom(page, event) {
  return page.evaluate(async ({ event }) => {
    return new Promise((resolve, _reject) => {
      document.addEventListener(event, () => {
        resolve(null);
      })
    })
  }, { event })
}

const appOrder = ["terminal", "file-manager", "editor", "manual", "other"];
export async function clickTaskbar(page, appName) {
  const appId = appOrder.indexOf(appName);
  return page.click(`#button-for-${appId}`);
}
