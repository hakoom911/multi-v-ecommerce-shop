import express from 'express';
import cors from "cors";
import { errorMiddleware } from '../../../packages/error-handler/error-middleware';
import cookieParser from 'cookie-parser';
import router from './routes/auth.router';


const app = express();

app.use(cors({
    origin: ['http://localhost:3000'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send({ 'message': 'Hello API' });
});

// Routes
app.use("/api",router)

app.use(errorMiddleware)

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 6001;
const server = app.listen(port, host, () => {
    console.log(`Auth service is running at http://${host}:${port}/api`)
})

server.on("error", (e) => {
    console.log("Server Error:", e)
})