import express from "express"
import getMsgsForConversation from "../controllers/msgs.contoller.js"

const router = express.Router();

router.get('/', getMsgsForConversation);

export default router;