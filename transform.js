/*
 * Format and Sign: pure HTML transform.
 * Formats only the author's own message (everything above the quoted thread)
 * in Aptos and inserts the signature right after the closing line.
 */
(function (root) {
  var FONT = "Aptos,Aptos_EmbeddedFont,Aptos_MSFontService,Calibri,Helvetica,sans-serif";
  var ND_CID = "fs-nd-logo.png";
  var INC_CID = "fs-inc5000.png";
  var SIG_MARKER = "AI Value & Services | NetDocuments";
  var CLOSINGS = /^(sincerely|best regards|kind regards|warm regards|regards|best|thank you|thanks|many thanks|cheers)\s*,?$/i;

  function p(text, bold) {
    var inner = bold ? "<b>" + text + "</b>" : text;
    return '<p style="margin:0in;font-family:Aptos,sans-serif;font-size:12pt">' + inner + "</p>";
  }

  function signatureHtml() {
    var tdL = 'style="padding:0in 5.4pt;vertical-align:top;width:99pt';
    var tdR = 'style="padding:0in;vertical-align:top;width:327.25pt';
    return (
      '<div class="fs-signature">' +
      '<div style="font-family:' + FONT + ';font-size:11pt;color:rgb(0,0,0)"><br></div>' +
      '<table style="box-sizing:border-box;border-collapse:collapse;border-spacing:0px"><tbody>' +
      "<tr>" +
      "<td " + tdL + ';height:36.45pt">' +
      '<p style="margin:0in;font-family:Aptos,sans-serif;font-size:12pt">' +
      '<a href="https://www.netdocuments.com/" style="color:rgb(0,0,0)">' +
      '<img src="cid:' + ND_CID + '" width="70" height="57" alt="NetDocuments" style="border:0;width:70px;height:57px"></a></p></td>' +
      "<td " + tdR + ';height:36.45pt">' +
      p("Stephanie Klahre", true) +
      p("Senior Legal Consultant") +
      p("AI Value &amp; Services | NetDocuments") +
      "</td></tr>" +
      "<tr><td " + tdL + ';height:1pt">' + p("&nbsp;") + "</td><td " + tdR + ';height:1pt">' + p("&nbsp;") + "</td></tr>" +
      "<tr>" +
      "<td " + tdL + '">' +
      '<p style="margin:0in;font-family:Aptos,sans-serif;font-size:12pt">' +
      '<a href="https://www.inc.com/inc5000/2022" style="color:rgb(0,0,0)">' +
      '<img src="cid:' + INC_CID + '" width="60" height="60" alt="Inc. 5000" style="border:0;width:60px;height:60px"></a></p></td>' +
      "<td " + tdR + '">' +
      p("O: 801-722-6654") +
      p("2500 Executive Parkway Suite 300, Lehi, UT 84048") +
      "</td></tr>" +
      "</tbody></table>" +
      p("&nbsp;") +
      "</div>"
    );
  }

  // First node that starts the quoted thread (reply/forward header or separator).
  function findBoundary(body) {
    return body.querySelector(
      '[id*="appendonsend"], [id*="divRplyFwdMsg"], [id*="RplyFwdMsg"], hr, blockquote[type="cite"]'
    );
  }

  function isBlock(el) {
    return el && el.nodeType === 1 && /^(DIV|P|LI|TD|H[1-6])$/.test(el.tagName);
  }

  function findClosing(wrapper) {
    var walker = wrapper.ownerDocument.createTreeWalker(wrapper, 4 /* SHOW_TEXT */, null);
    var found = null, n;
    while ((n = walker.nextNode())) {
      if (CLOSINGS.test(n.nodeValue.replace(/ /g, " ").trim())) found = n; // keep last match
    }
    if (!found) return null;
    var el = found.parentNode;
    while (el && el !== wrapper && !isBlock(el)) el = el.parentNode;
    return el && el !== wrapper ? el : found;
  }

  function stripTrailingBreaks(wrapper) {
    var last = wrapper.lastChild;
    while (last) {
      var isEmptyText = last.nodeType === 3 && !last.nodeValue.trim();
      var isBr = last.nodeType === 1 && last.tagName === "BR";
      var isEmptyDiv = last.nodeType === 1 && /^(DIV|P)$/.test(last.tagName) &&
        !last.textContent.replace(/ /g, "").trim() && !last.querySelector("img,table");
      if (!(isEmptyText || isBr || isEmptyDiv)) break;
      wrapper.removeChild(last);
      last = wrapper.lastChild;
    }
  }

  /**
   * Returns { html, addedSignature, alreadyFormatted }.
   */
  function transform(html, doc) {
    doc = doc || new DOMParser().parseFromString(html, "text/html");
    var body = doc.body;
    if (body.querySelector(".fs-mine")) {
      return { html: html, addedSignature: false, alreadyFormatted: true };
    }

    var boundary = findBoundary(body);
    var range = doc.createRange();
    range.setStart(body, 0);
    if (boundary) range.setEndBefore(boundary); else range.setEnd(body, body.childNodes.length);
    var mine = range.extractContents();

    var wrapper = doc.createElement("div");
    wrapper.className = "fs-mine";
    wrapper.setAttribute("style", "font-family:" + FONT + ";font-size:12pt;color:rgb(0,0,0)");
    wrapper.appendChild(mine);

    var addedSignature = false;
    if (wrapper.textContent.indexOf(SIG_MARKER) === -1) {
      stripTrailingBreaks(wrapper);
      var tmp = doc.createElement("div");
      tmp.innerHTML = signatureHtml();
      var sig = tmp.firstChild;
      var closing = findClosing(wrapper);
      if (closing && closing.parentNode) {
        closing.parentNode.insertBefore(sig, closing.nextSibling);
      } else {
        wrapper.appendChild(sig);
      }
      addedSignature = true;
    }

    // Space between the signature and the quoted thread.
    if (boundary) wrapper.appendChild(doc.createElement("br"));
    body.insertBefore(wrapper, body.firstChild);
    return { html: doc.documentElement.outerHTML, addedSignature: addedSignature, alreadyFormatted: false };
  }

  root.FormatAndSign = { transform: transform, ND_CID: ND_CID, INC_CID: INC_CID };
})(typeof window !== "undefined" ? window : this);
