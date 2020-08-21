#!/usr/bin/env python

# This is a helper used by `update-pdfjs` to update the Mustache template for
# serving PDFs with PDFJS with the local dev server.

import os
import sys

# Header to insert at the top of the generated PDF.js viewer template
FILE_HEADER = """
<!-- AUTO-GENERATED BY {}. DO NOT EDIT. -->
""".format(
    sys.argv[0]
)

# Header to insert after the original `<title>` tag in the PDF viewer HTML
# mustache template.
#
# This header is responsible for:
#
# - Adding a `<base>` tag so that relative URLs in the pre-built viewer HTML
#   resolve to the right URL.
# - Injecting custom PDF.js viewer configuration
# - Injecting the Hypothesis client entry point and configuration
#
# The header needs to be inserted after the `<title>` tag so we can override it,
# but before any relative asset links which will be affected by the `<base>`
# tag.
#
HYPOTHESIS_HEADER = """
<!-- Begin Hypothesis modifications -->
<base href="/scripts/pdfjs-2/web/">

<title>via Hypothesis</title>
{#
  It's worth noting that this link tag is *not* currently used by the
  Hypothesis client to determine the URL of this page. For consistency with
  how these pages are served on via, however, we serve it with the PDF.js
  viewer application.
-#}
<link rel="canonical" href="{{{ documentUrl }}}"/>
<script>
window.DOCUMENT_URL = '{{{documentUrl}}}';
window.PDF_URL = '{{{ url }}}';
window.CLIENT_URL = '{{{clientUrl}}}'.replace('{current_host}', document.location.hostname);
</script>

<script src="/scripts/pdfjs-init.js"></script>

{# Configure Hypothesis client. #}
<script>
window.hypothesisConfig = function() {
  return {
    openSidebar: true,
  };
};
</script>
<!-- End Hypothesis modifications -->
"""


def insert_after(str_, search_str, insert_str):
    return str_.replace(search_str, search_str + insert_str)


input_file_path = sys.argv[1]
output_file_path = sys.argv[2]

input_file = open(input_file_path, "r")
output_file = open(output_file_path, "w")
base_dir = os.path.dirname(input_file_path)

viewer_html = input_file.read()
viewer_html = insert_after(viewer_html, "<!DOCTYPE html>", FILE_HEADER)
viewer_html = insert_after(
    viewer_html, "</title>", HYPOTHESIS_HEADER.replace("$BASEDIR", base_dir)
)
output_file.write(viewer_html)