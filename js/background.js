chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("installed", chrome.action);
  }
});

chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});
