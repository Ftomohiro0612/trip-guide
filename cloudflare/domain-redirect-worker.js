const CANONICAL_ORIGIN = "https://memorips.com";

const worker = {
  async fetch(request) {
    const source = new URL(request.url);
    const destination = new URL(source.pathname + source.search, CANONICAL_ORIGIN);
    if (destination.pathname.length > 1 && destination.pathname.endsWith("/")) {
      destination.pathname = destination.pathname.slice(0, -1);
    }
    return Response.redirect(destination, 301);
  },
};

export default worker;
