import app from "./app";
import { initAppDatabase } from "./config/appDatabase";
import scheduleService from "./schedule/schedule.service";

const PORT = process.env.PORT || 5000;

(async () => {
    await initAppDatabase();

    try {
        await scheduleService.initSchedules();
    } catch (err: any) {
        console.error("Failed to load migration schedules (scheduling will be unavailable until fixed):", err.message);
    }

    app.listen(PORT, () => {
        console.log(`Server running on ${PORT}`);
    });
})();