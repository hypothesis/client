'use strict';
/*
* This function handles authentication errors resultinga fter calls to the API, later it handles redirection
* wether user is an admin or an student, checks if user is annotation in the pdfjs service.
* @param response - The regular API response from a Promise.
* @param isStudent - A boolean denoting wether user is an student or an admin.
*/
function authErrorRedirectionHandler(response, isStudent) {
    if (response.status === 401) {
        const isNewGrading = window.top.location.href.includes('/grading');
        const isPdfJs = window.top.location.href.includes('pdfjs');
        let key = '';
        let oldLocation = '';
        if (isNewGrading) {
            key = 'requestedGradingUrl';
            oldLocation = window.top.location.href.split(location.host).pop();
        } else if (isPdfJs) {
            key = 'requestedPdfJsUrl';
            oldLocation = window.top.location.href;
        } else {
            key = 'requestedHash';
            oldLocation = window.top.location.hash;
        }
        window.localStorage.setItem(key, oldLocation);
        window.top.location.href = '/' + isStudent ? 'student?alert=noSession' : 'admin?alert=noSession';
    }
    return false;
}

module.exports = authErrorRedirectionHandler;
