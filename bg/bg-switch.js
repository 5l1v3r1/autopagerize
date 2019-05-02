export {
  switchGlobalState,
};

let busy, stopIt;

async function switchGlobalState(state) {
  if (busy) {
    stopIt = true;
    while (stopIt)
      await new Promise(setTimeout);
  }
  busy = true;
  stopIt = false;
  chrome.contextMenus.update('onOff', {checked: state});
  await (state ? activate() : deactivate());
  busy = false;
}

async function activate() {
  localStorage.enabled = '';
  self.observeNavigation();
  for (const {id, url} of await queryTabs()) {
    await self.maybeProcessMain({url, tabId: id, frameId: 0});
    if (stopIt)
      return;
  }
}

async function deactivate() {
  localStorage.enabled = 'false';
  chrome.webNavigation.onCompleted.removeListener(self.maybeProcessMain);
  chrome.webNavigation.onHistoryStateUpdated.removeListener(self.maybeProcess);
  chrome.webNavigation.onReferenceFragmentUpdated.removeListener(self.maybeProcess);

  const exec = (await import('/bg/bg-launch.js')).executeScript;
  for (const {id} of await queryTabs()) {
    chrome.pageAction.hide(id, ignoreLastError);
    chrome.pageAction.setIcon({tabId: id, path: 'icons/off/icon16.png'}, ignoreLastError);
    await exec(id, {
      code: `
        typeof run === 'function' &&
        run({terminate: true});
      `,
    });
    if (stopIt)
      return;
  }
}

function queryTabs() {
  return new Promise(r => chrome.tabs.query({url: '*://*/*'}, r));
}