const tabCount = document.querySelector(".count");
const allTabsContent = document.querySelector(".all-tabs");
const groupBySiteBtn = document.querySelector(".group-by-site");
const groupSelectedBtn = document.querySelector(".group-selected");
const searchInput = document.querySelector(".search-input");

let allTabs;
let allTabItems;
let query = "";
let tabSelected = [];

const getCurrentTabs = async () => {
  const tabs = await chrome.tabs.query({});
  return tabs;
};

const selectTab = (tab) => {
  tabSelected.push(tab);
  const tabSelectedEle = _.find(
    allTabItems,
    (t) => parseInt(t.dataset.tabid) === tab.id
  );
  tabSelectedEle.classList.add("selected");
};

const toggleMuteState = async (tabId) => {
  console.log("tabId", tabId);
  const tab = await chrome.tabs.get(tabId);
  const muted = !tab.mutedInfo.muted;
  await chrome.tabs.update(tabId, { muted });
  console.log(`Tab ${tab.id} is ${muted ? "muted" : "unmuted"}`);
};

const closeTab = async (tabId) => {
  await chrome.tabs.remove(tabId);
  allTabs = allTabs.filter((tab) => tab.id !== tabId);
  onSearch(query);
};

const reloadTab = async (tabId) => {
  await chrome.tabs.reload(tabId);
};

const moveToFirstPosition = async (tabId) => {
  try {
    await chrome.tabs.move(tabId, { index: 0 });
    console.log("Success.");
  } catch (error) {
    if (
      error ==
      "Error: Tabs cannot be edited right now (user may be dragging a tab)."
    ) {
      setTimeout(() => moveToFirstPosition(tabId), 50);
    } else {
      console.error(error);
    }
  }
};

const renderTabs = (tabs) => {
  const activeTabsHtml = tabs
    .map((tab) => {
      return `
    <div class="d-flex align-items-center justify-content-between mb-2 tab-item" data-tabid=${
      tab.id
    }>
      <div class="d-flex align-items-center left">
        <div class="d-flex align-items-center justify-content-center tab-icon">
          <img src=${tab.favIconUrl} class="tab-icon-image" alt="" />
        </div>
        <p class="mx-2 tab-title">${tab.title}</p>
      </div>
      <div class="right">
        <p class="tab-url">${new URL(tab.url).hostname}</p>
        <div class="d-flex align-items-center justify-content-center actions">
        <img data-tabid=${
          tab.id
        } width="16px" height="16px" src="./assets/select-tab.png" alt="" class="action-icon select" />
          ${
            tab.audible
              ? `<img data-tabid=${tab.id} width="16px" height="16px" src="./assets/mute.png" alt="" class="action-icon mute" />`
              : ""
          }
          <img data-tabid=${tab.id} width="16px" height="16px" src="./assets/${
        tab.active ? "reload.png" : "close.png"
      }" alt="" class="action-icon ${tab.active ? "reload" : "close"}" />
        </div>
      </div>
    </div>
    `;
    })
    .join("");
  allTabsContent.innerHTML = activeTabsHtml;
};

const groupTabBySite = (tabs) => {
  groupTabs(tabs);
};

const groupSelectedTab = (tabs) => {
  const isClicked = groupSelectedBtn.dataset.groupClicked === "true";
  groupSelectedBtn.dataset.groupClicked = isClicked ? "false" : "true";
  if (!isClicked) {
    groupTabs(tabs);
    groupSelectedBtn.classList.add("active");
  } else {
    ungroupTabs(tabs);
    const tabIdSelected = _.map(tabSelected, "id");
    const tabSelectedEle = _.forEach(
      _.filter(allTabItems, (t) =>
        tabIdSelected.includes(parseInt(t.dataset.tabid))
      ),
      (elem) => {
        elem.classList.remove("selected");
      }
    );
    tabSelected = [];
    groupSelectedBtn.classList.remove("active");
  }
};

const groupAllTab = (allTabs) => {
  const isClicked = groupBySiteBtn.dataset.clicked === "true";
  groupBySiteBtn.dataset.clicked = isClicked ? "false" : "true";
  if (!isClicked) {
    groupBySiteBtn.classList.add("active");
  } else {
    groupBySiteBtn.classList.remove("active");
  }
  const groupBySite = _.groupBy(allTabs, (tab) => new URL(tab.url).hostname);
  _.map(groupBySite, (site) => {
    if (isClicked) {
      ungroupTabs(site);
    } else {
      if (site.length > 1) {
        groupTabs(site);
      }
    }
  });
};

const groupTabs = (tabs) => {
  chrome.tabs.group({ tabIds: _.map(tabs, (t) => t.id) });
};

const ungroupTabs = (tabs) => {
  chrome.tabs.ungroup(_.map(tabs, (t) => t.id));
};

const registerEventForAction = () => {
  const muteIcons = document.querySelectorAll(".mute");
  const selectIcons = document.querySelectorAll(".select");
  const reloadIcons = document.querySelectorAll(".reload");
  const closeIcons = document.querySelectorAll(".close");
  _.forEach(allTabs, (tab, i) => {
    if (tab.audible) {
      _.forEach(muteIcons, (icon) => {
        icon.addEventListener("click", () => {
          toggleMuteState(tab.id);
        });
      });
    }

    _.forEach(selectIcons, (icon) => {
      if (icon.dataset.tabid === tab.id.toString()) {
        icon.addEventListener("click", () => {
          selectTab(tab);
        });
      }
    });

    _.forEach(closeIcons, (icon) => {
      if (icon.dataset.tabid === tab.id.toString()) {
        icon.addEventListener("click", () => {
          closeTab(tab.id);
        });
      }
    });

    _.forEach(reloadIcons, (icon) => {
      if (icon.dataset.tabid === tab.id.toString()) {
        icon.addEventListener("click", () => {
          reloadTab(tab.id);
        });
      }
    });
  });
};

const registerOnChangeTabUpdate = () => {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log(changeInfo);
    if (changeInfo.status === "complete") {
      const updateTab = allTabs.find((tab) => tab.id === tabId);
      if (changeInfo.title) {
        updateTab.title = changeInfo.title;
      }
      if (changeInfo.url) {
        updateTab.url = changeInfo.url;
      }
      allTabs = allTabs.map((item) =>
        item.id == updateTab.id ? updateTab : item
      );
      onSearch(query);
    }
  });
};

const render = (tabs) => {
  console.log("render");
  tabCount.innerText = tabs.length;
  const sorted = _.sortBy(tabs, (t) => t.active).reverse();
  const groupBySite = _.orderBy(sorted, (tab) => new URL(tab.url).hostname);
  renderTabs(groupBySite);
  registerEventForAction();
};

const registerTooltip = () => {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  const tooltipList = [...tooltipTriggerList].map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
  );
};

const onSearch = (searchQuery) => {
  query = searchQuery;
  console.log("allTabs", allTabs);
  const results = _.compact(
    _.map(allTabs, (tab) => {
      if (new URL(tab.url).hostname.includes(query)) {
        return tab;
      }
    })
  );
  render(results);
};

document.addEventListener("DOMContentLoaded", async function () {
  registerTooltip();
  allTabs = await getCurrentTabs();
  render(allTabs);
  groupBySiteBtn.addEventListener("click", () => {
    groupAllTab(allTabs);
  });
  groupSelectedBtn.addEventListener("click", () => {
    groupSelectedTab(tabSelected);
  });
  searchInput.addEventListener("input", (e) => {
    onSearch(e.target.value);
  });
  registerOnChangeTabUpdate();
  allTabItems = document.querySelectorAll(".tab-item");
});
