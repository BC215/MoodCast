import { AdminLayout } from "../common/AdminLayout";
import { DashboardActiveUserChart } from "./DashboardActiveUserChart";
import { DashboardEmotionActivityChart } from "./DashboardEmotionActivityChart";
import { DashboardMetricCards } from "./DashboardMetricCards";
import { DashboardNoticeModal } from "./DashboardNoticeModal";
import { DashboardRecentActivities } from "./DashboardRecentActivities";
import styles from "../../adminComponentsCss/dashboard/AdminDashboardPage.module.css";

export function AdminDashboardPage() {
  return (
    <AdminLayout
      title={"\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC"}
      description={"\uD68C\uC6D0, \uAC8C\uC2DC\uAE00, \uD65C\uB3D9 \uD604\uD669\uC744 \uD55C\uB208\uC5D0 \uD655\uC778\uD558\uC138\uC694."}
    >
      <DashboardNoticeModal />
      <DashboardMetricCards />

      <section className={styles.dashboardGrid}>
        <div className={styles.dashboardMainColumn}>
          <DashboardEmotionActivityChart />
          <DashboardActiveUserChart />
        </div>

        <div className={styles.dashboardSideColumn}>
          <DashboardRecentActivities />
        </div>
      </section>
    </AdminLayout>
  );
}
