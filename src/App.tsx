import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "./store/auth";
import { AppLayout } from "./layouts/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import { Home } from "./pages/Home";
import { SignIn } from "./pages/SignIn";
import { ResetPassword } from "./pages/ResetPassword";
import { Discover } from "./pages/Discover";
import { Connect } from "./pages/Connect";
import { Contribute } from "./pages/Contribute";
import { Opportunities } from "./pages/Opportunities";
import { Jobs } from "./pages/Jobs";
import { Scholarships } from "./pages/Scholarships";
import { Competitions } from "./pages/Competitions";
import { Admissions } from "./pages/Admissions";
import { Advertise } from "./pages/Advertise";
import { SubmitOpportunity } from "./pages/SubmitOpportunity";
import { OpportunityDetail } from "./pages/OpportunityDetail";
import { PostDetail } from "./pages/PostDetail";
import { Profile } from "./pages/Profile";
import { Organizations } from "./pages/Organizations";
import { OrganizationPage } from "./pages/OrganizationPage";
import { OrganizationRegister } from "./pages/OrganizationRegister";
import { OrganizationManage } from "./pages/OrganizationManage";
import { JobDetail } from "./pages/JobDetail";
import { JobApply } from "./pages/JobApply";
import { JobApplicants } from "./pages/JobApplicants";
import { SearchPage } from "./pages/SearchPage";
import { Notifications } from "./pages/Notifications";
import { Messages } from "./pages/Messages";
import { Saved } from "./pages/Saved";
import { Impact } from "./pages/Impact";
import { Settings } from "./pages/Settings";
import { Admin } from "./pages/Admin";
import { OpportunityDiscoveryAdmin } from "./pages/OpportunityDiscoveryAdmin";
import { Study } from "./pages/Study";
import { StudyTopic } from "./pages/StudyTopic";
import { StudyPractice } from "./pages/StudyPractice";
import { StudyTogether } from "./pages/StudyTogether";
import { StudyThread } from "./pages/StudyThread";
import { StudySettings } from "./pages/StudySettings";
import { PossaraPlus } from "./pages/PossaraPlus";
import { Applications } from "./pages/Applications";
import { Passport } from "./pages/Passport";
import { Insights } from "./pages/Insights";

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    const unsubscribe = useAuth.getState().init();
    return unsubscribe;
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/learn" element={<Study />} />
              <Route path="/study" element={<Study />} />
              <Route path="/study/topic/:id" element={<StudyTopic />} />
              <Route path="/study/practice" element={<StudyPractice />} />
              <Route path="/study/practice/:topicId" element={<StudyPractice />} />
              <Route path="/study/together" element={<StudyTogether />} />
              <Route path="/study/together/:id" element={<StudyThread />} />
              <Route path="/connect" element={<Connect />} />
              <Route path="/contribute" element={<Contribute />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/scholarships" element={<Scholarships />} />
              <Route path="/competitions" element={<Competitions />} />
              <Route path="/admissions" element={<Admissions />} />
              <Route path="/advertise" element={<Advertise />} />
              <Route path="/opportunities/:id" element={<OpportunityDetail />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/profile/id/:id" element={<Profile />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/organizations/:slug" element={<OrganizationPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/impact" element={<Impact />} />
              <Route path="/plus" element={<PossaraPlus />} />

              <Route element={<RequireAuth />}>
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/organizations/register" element={<OrganizationRegister />} />
                <Route path="/organizations/manage" element={<OrganizationManage />} />
                <Route path="/jobs/:id/apply" element={<JobApply />} />
                <Route path="/organizations/jobs/:id/applicants" element={<JobApplicants />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:userId" element={<Messages />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/study/settings" element={<StudySettings />} />
                <Route path="/submit-opportunity" element={<SubmitOpportunity />} />
                <Route path="/applications" element={<Applications />} />
                <Route path="/passport" element={<Passport />} />
                <Route path="/insights" element={<Insights />} />
              </Route>

              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/opportunity-discovery" element={<OpportunityDiscoveryAdmin />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
