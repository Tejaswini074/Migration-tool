import app from "./app";
import { initAppDatabase } from "./config/appDatabase";

const PORT = process.env.PORT || 5000;

(async () => {
    await initAppDatabase();
    app.listen(PORT, () => {
        console.log(`Server running on ${PORT}`);
    });
})();