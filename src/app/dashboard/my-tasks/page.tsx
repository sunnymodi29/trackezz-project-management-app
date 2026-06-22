import { getBootstrapData } from "@/lib/queries/bootstrap";
import { MyTasksList } from "@/app/dashboard/my-tasks/my-tasks-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Tasks" };

export default async function MyTasksPage() {
  const data = await getBootstrapData();
  if (!data.hasWorkspace) return null;

  const { currentUser, issues, projects } = data;
  const myIssues = issues.filter((i) => i.assigneeIds.includes(currentUser.id));

  return <MyTasksList issues={myIssues} projects={projects} />;
}
