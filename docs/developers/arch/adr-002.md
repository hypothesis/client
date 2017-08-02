ADR 2: ePub Support
=====================================================

Context
-------

### Background

Before now, the client had not had the necessary pieces to support the standard ePub
book format. The primary obstacles that had to be traversed were 1) supporting iframe annotation, 2) document equivalency, and 3) scrolling to annotations.

Decision
--------

* Standard ePubs viewers (including Readium and ePubJS) use iframes as a way to embed the different book pages and render them inside of their viewer. Hypothesis, before now, did not support going into iframes and allowing annotation. We modified our client to be able to watch for same origin iframes (cross origin not supported yet) on the page. When an iframe is encountered, we (if we have access to it) inject the Hypothesis embed code inside. In addition to the embed, we mirror the embed configuration values that were set. The last part of this injection is adding a “subFrameIdentifier” field to the configuration that is a random string that does two things 1) identifies the sub frame so the top frame has a point of unique reference and 2) the existence of this field tells the injected client that it should only load the Guest and not the full sidebar UI. So to recap, the client watches for iframes then injects the client and configuration into new frames. The Guest only clients inside of the frames will now be able to make and load annotations for their respective iframe locations. The client uses cross frame library to communicate what data to load - so subframes have those requests bubble up to the top frame. The sidebar stores an array of frames that it loads data for and does another cross frame call when data is returned. With all of that, the client is now able to support annotating content inside of an iframe.

* For document equivalency, we support for documents to set two new dc-* meta tags to indicate 1) what book we are in and 2) what chapter are we in. Together, this allows cross domain document equivalency down to the chapter level of an ePub. The tags are: “dc.identifier” for the chapter and “dc.relation.isPartOf” for the unique book identifier.

* Since ePubs use iframes for their presentation, those frames have content in various layouts/locations and move the visible area of the frame as the user is navigating to the next page (similar to how image sprites are used to show a single icon from a large image that has many icons). There is no standard event in web standards or ePub that we can use to navigate to the proper section in the frame and have it properly align the frame to include the page contents in the same manner that it does when you manually navigate to the page. That is, we could use “scrollTo” functions but those functions will just bring the section into view but makes no attempt to properly snap to the correct vertical and horizontal spacing that make up a whole page. This meant that unless we fixed it, users who select an annotation attempting to navigate to it could end up in scenarios where the highlighted section is visible but you cut the book's visible page in half. To fix this, we introduced an implementation agnostic “scrollToRange” event that we attempt to use before falling back to the traditional scrollTo event. That is, if the site registers a listener for “scrollToRange” and preventsDefault() we assume that they have taken the range and applied the proper scrolling behavior needed to get the range into view correctly.

Status
------

Deployed
