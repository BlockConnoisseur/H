import { eveChannel } from "eve/channels/eve";

export default eveChannel({
  // Only the authenticated research channel may dispatch paid work.
  auth: [],
});
