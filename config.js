function saveAPIKey(e) {
    chrome.storage.local.set({
        api_key: document.querySelector("#api_key").value
    });
}

function restoreAPIKey() {
    chrome.storage.local.get('api_key', (res) => {
        if (res.api_key === undefined) {
            document.querySelector("#api_key").value = '';
        } else {
            document.querySelector("#api_key").value = res.api_key;
        }
    });
}

document.addEventListener('DOMContentLoaded', restoreAPIKey);
document.querySelector("form").addEventListener("submit", saveAPIKey);