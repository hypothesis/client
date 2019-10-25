'use strict';
/*
* This function handles authentication errors resulting after calls to the API, later it handles redirection
* wether user is an admin or an student, checks if user is annotation in the pdfjs service.
*/
function authErrorRedirectionHandler() {
    window.parent.parent.postMessage({ hypothesis: true, action: 'redirectToLogin' }, '*');
}

module.exports = authErrorRedirectionHandler;
