import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { createRequestHandler, logDevReady } from "@remix-run/cloudflare";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

import * as build from "./build";

const assetManifest = JSON.parse(manifestJSON);
const handleRemixRequest = createRequestHandler(build, process.env.NODE_ENV);

if (process.env.NODE_ENV === "development") {
  logDevReady(build);
}

export default {
  async fetch(
    request: Request,
    env: {
      __STATIC_CONTENT: Fetcher;
    },
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);
      const ttl = url.pathname.startsWith("/build/")
        ? 60 * 60 * 24 * 365 // 1 year
        : 60 * 5; // 5 minutes
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        } as FetchEvent,
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
          cacheControl: {
            browserTTL: ttl,
            edgeTTL: ttl,
          },
        }
      );
    } catch (error) {}

    try {
      const loadContext: AppLoadContext = {
        env,
      };
      return await handleRemixRequest(request, loadContext);
    } catch (error) {
      console.log(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};