import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { mergeOldDuplicateConversations } from './services/conversation';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(routes);

app.listen(PORT, () => {
  console.log(`Lets Chat Backend listening on port ${PORT}`);
  mergeOldDuplicateConversations();
});
