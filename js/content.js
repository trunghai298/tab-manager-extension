function injectScript(file_path, tag) {
  const node = document.getElementsByTagName(tag)[0];
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", file_path);
  node.appendChild(script);
  console.log("injected");
}

injectScript(chrome.runtime.getURL("js/content.js"), "body");

let extensionPort;

const setupFunction = () => {
  console.log("set up");
  extensionPort = chrome.runtime.connect({ name: "popup" });
  console.log("port: ", extensionPort);
};

setupFunction();
