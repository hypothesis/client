'use strict';
/*
* This function handles authentication errors resultinga fter calls to the API, later it handles redirection
* wether user is an admin or an student, checks if user is annotation in the pdfjs service.
* @param response - The regular API response from a Promise.
* @param isStudent - A boolean denoting wether user is an student or an admin.
*/
function authErrorRedirectionHandler(response) {
    if (response.status === 401) {
        window.parent.parent.postMessage({ redirectToLogin: true });
    }
    return false;
}

module.exports = authErrorRedirectionHandler;
