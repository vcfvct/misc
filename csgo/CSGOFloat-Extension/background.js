chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    fetch(`http://csgofloat.cf:8888/?url=${request.inspectLink}`)
    .then((response) => {
        response.json().then((data) => sendResponse(data));
    })
    .catch((err) => sendResponse(err));

    return true;
});
