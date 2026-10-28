import { builder } from "@builder.io/sdk";
import VariantContainerRepro from "./VariantContainerRepro";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

// Repro for Pylon #21532: Gen 1 SDK drops shared emotion rules when the winning
// variant is not the first variant inside a variant container.
// Create a `page` model entry with URL /variant-container-repro (see README section below).
// Customer-side workaround candidate (?fix=1): an inline script placed BEFORE the variant container.
// A MutationObserver sees each <template> the SDK's inline script discards and copies its
// emotion <style data-emotion-css> tags into <head> so the winning variant keeps its rules.
const HOIST_STYLES_SCRIPT = `(function(){
  function hoist(node){
    if(node.nodeType!==1)return;
    var ts=node.tagName==='TEMPLATE'?[node]:[];
    ts=ts.concat([].slice.call(node.querySelectorAll('template')));
    ts.forEach(function(t){
      [].slice.call(t.content.querySelectorAll('style[data-emotion-css]')).forEach(function(s){
        var id=s.getAttribute('data-emotion-css');
        if(document.querySelector('style[data-emotion-css="'+id+'"]'))return;
        var c=s.cloneNode(true);c.setAttribute('data-hoisted','');document.head.appendChild(c);
      });
    });
  }
  var mo=new MutationObserver(function(ms){ms.forEach(function(m){[].slice.call(m.removedNodes).forEach(hoist);});});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',function(){mo.disconnect();});
})();`;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fix?: string }>;
}) {
  const fix = (await searchParams).fix === "1";
  // Modern implementation: NO server-side targeting via userAttributes (except urlPath).
  // The server renders every variant; the client/inline script picks the winner.
  const content =
    (await builder
      .get("page", {
        userAttributes: { urlPath: "/variant-container-repro" },
        options: { includeRefs: true, enrich: true },
        cachebust: true,
      })
      .toPromise()) ?? null;

  return (
    <>
      {fix && <script dangerouslySetInnerHTML={{ __html: HOIST_STYLES_SCRIPT }} />}
      <VariantContainerRepro content={content} />
    </>
  );
}
