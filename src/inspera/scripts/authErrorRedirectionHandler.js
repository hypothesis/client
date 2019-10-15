'use strict';
/*
* This function handles authentication errors resulting after calls to the API, later it handles redirection
* wether user is an admin or an student, checks if user is annotation in the pdfjs service.
* @param response - The regular API response from a Promise.
*/
function authErrorRedirectionHandler(response) {
    if (response.status === 401) {
        window.parent.parent.postMessage({ hypothesis: true, action: 'redirectToLogin' }, '*');
    }
    return false;
}

module.exports = authErrorRedirectionHandler;
