import { lazy, Suspense, useEffect } from "react";
import { PageLoading } from "./components/PageLoading";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "./store/auth";
import { AppLayout } from "./layouts/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ImageActions } from "./components/ImageActions";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import { Home } from "./pages/Home";
import { SignIn } from "./pages/SignIn";

const ResetPassword=lazy(()=>import("./pages/ResetPassword").then(module=>({default:module.ResetPassword})));
const VerifyEmail=lazy(()=>import("./pages/VerifyEmail").then(module=>({default:module.VerifyEmail})));
const Discover=lazy(()=>import("./pages/Discover").then(module=>({default:module.Discover})));
const Connect=lazy(()=>import("./pages/Connect").then(module=>({default:module.Connect})));
const Contribute=lazy(()=>import("./pages/Contribute").then(module=>({default:module.Contribute})));
const CreateContent=lazy(()=>import("./pages/CreateContent").then(module=>({default:module.CreateContent})));
const Opportunities=lazy(()=>import("./pages/Opportunities").then(module=>({default:module.Opportunities})));
const Jobs=lazy(()=>import("./pages/Jobs").then(module=>({default:module.Jobs})));
const Scholarships=lazy(()=>import("./pages/Scholarships").then(module=>({default:module.Scholarships})));
const Competitions=lazy(()=>import("./pages/Competitions").then(module=>({default:module.Competitions})));
const Admissions=lazy(()=>import("./pages/Admissions").then(module=>({default:module.Admissions})));
const Advertise=lazy(()=>import("./pages/Advertise").then(module=>({default:module.Advertise})));
const SubmitOpportunity=lazy(()=>import("./pages/SubmitOpportunity").then(module=>({default:module.SubmitOpportunity})));
const OpportunityDetail=lazy(()=>import("./pages/OpportunityDetail").then(module=>({default:module.OpportunityDetail})));
const PostDetail=lazy(()=>import("./pages/PostDetail").then(module=>({default:module.PostDetail})));
const Profile=lazy(()=>import("./pages/Profile").then(module=>({default:module.Profile})));
const Organizations=lazy(()=>import("./pages/Organizations").then(module=>({default:module.Organizations})));
const OrganizationPage=lazy(()=>import("./pages/OrganizationPage").then(module=>({default:module.OrganizationPage})));
const OrganizationRegister=lazy(()=>import("./pages/OrganizationRegister").then(module=>({default:module.OrganizationRegister})));
const OrganizationManage=lazy(()=>import("./pages/OrganizationManage").then(module=>({default:module.OrganizationManage})));
const JobDetail=lazy(()=>import("./pages/JobDetail").then(module=>({default:module.JobDetail})));
const JobPostWizard=lazy(()=>import("./pages/JobPostWizard").then(module=>({default:module.JobPostWizard})));
const JobApply=lazy(()=>import("./pages/JobApply").then(module=>({default:module.JobApply})));
const JobApplicants=lazy(()=>import("./pages/JobApplicants").then(module=>({default:module.JobApplicants})));
const JobCbt=lazy(()=>import("./pages/JobCbt").then(module=>({default:module.JobCbt})));
const JobCbtBuilder=lazy(()=>import("./pages/JobCbtBuilder").then(module=>({default:module.JobCbtBuilder})));
const JobApplicantReview=lazy(()=>import("./pages/JobApplicantReview").then(module=>({default:module.JobApplicantReview})));
const JobInterviewBuilder=lazy(()=>import("./pages/JobInterviewBuilder").then(module=>({default:module.JobInterviewBuilder})));
const OrganizationTeam=lazy(()=>import("./pages/OrganizationTeam").then(module=>({default:module.OrganizationTeam})));
const OrganizationSettings=lazy(()=>import("./pages/OrganizationSettings").then(module=>({default:module.OrganizationSettings})));
const SearchPage=lazy(()=>import("./pages/SearchPage").then(module=>({default:module.SearchPage})));
const Notifications=lazy(()=>import("./pages/Notifications").then(module=>({default:module.Notifications})));
const Messages=lazy(()=>import("./pages/Messages").then(module=>({default:module.Messages})));
const Saved=lazy(()=>import("./pages/Saved").then(module=>({default:module.Saved})));
const Impact=lazy(()=>import("./pages/Impact").then(module=>({default:module.Impact})));
const Settings=lazy(()=>import("./pages/Settings").then(module=>({default:module.Settings})));
const Admin=lazy(()=>import("./pages/Admin").then(module=>({default:module.Admin})));
const OpportunityDiscoveryAdmin=lazy(()=>import("./pages/OpportunityDiscoveryAdmin").then(module=>({default:module.OpportunityDiscoveryAdmin})));
const Study=lazy(()=>import("./pages/Study").then(module=>({default:module.Study})));
const StudyTopic=lazy(()=>import("./pages/StudyTopic").then(module=>({default:module.StudyTopic})));
const StudyPractice=lazy(()=>import("./pages/StudyPractice").then(module=>({default:module.StudyPractice})));
const StudyTogether=lazy(()=>import("./pages/StudyTogether").then(module=>({default:module.StudyTogether})));
const StudyThread=lazy(()=>import("./pages/StudyThread").then(module=>({default:module.StudyThread})));
const StudySettings=lazy(()=>import("./pages/StudySettings").then(module=>({default:module.StudySettings})));
const PossaraPlus=lazy(()=>import("./pages/PossaraPlus").then(module=>({default:module.PossaraPlus})));
const Applications=lazy(()=>import("./pages/Applications").then(module=>({default:module.Applications})));
const Passport=lazy(()=>import("./pages/Passport").then(module=>({default:module.Passport})));
const Insights=lazy(()=>import("./pages/Insights").then(module=>({default:module.Insights})));
const Places=lazy(()=>import("./pages/Places").then(module=>({default:module.Places})));
const PrivacyPolicy=lazy(()=>import("./pages/TrustPolicies").then(module=>({default:module.PrivacyPolicy})));
const SecurityPage=lazy(()=>import("./pages/TrustPolicies").then(module=>({default:module.SecurityPage})));
const TermsOfUse=lazy(()=>import("./pages/TrustPolicies").then(module=>({default:module.TermsOfUse})));

const queryClient = new QueryClient();

function AccountEmailGate() {
  const { userId, emailVerified, loading } = useAuth();
  const location = useLocation();
  const allowedWhileUnverified =
    location.pathname === "/verify-email" || location.pathname === "/reset-password";

  // Normal refreshes render the app immediately. Supabase restores the cached
  // session in the background; protected routes still enforce auth separately.
  if (!loading && userId && !emailVerified && !allowedWhileUnverified) {
    return <Navigate to="/verify-email" replace />;
  }
  if (location.pathname === "/create/post" || location.pathname === "/create/moment") return <Outlet />;
  return <AppLayout />;
}

export default function App() {
  useEffect(() => {
    const unsubscribe = useAuth.getState().init();
    return unsubscribe;
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ImageActions />
          <Suspense fallback={<PageLoading />}><Routes>
            <Route element={<AccountEmailGate />}>
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/places" element={<Places />} />
              <Route path="/learn" element={<Study />} />
              <Route path="/study" element={<Study />} />
              <Route path="/study/topic/:id" element={<StudyTopic />} />
              <Route path="/study/practice" element={<StudyPractice />} />
              <Route path="/study/practice/:topicId" element={<StudyPractice />} />
              <Route path="/study/together" element={<StudyTogether />} />
              <Route path="/study/together/:id" element={<StudyThread />} />
              <Route path="/connect" element={<Connect />} />
              <Route path="/contribute" element={<Contribute />} />
              <Route path="/create/post" element={<CreateContent kind="post" />} />
              <Route path="/create/moment" element={<CreateContent kind="moment" />} />
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
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="/security" element={<SecurityPage />} />

              <Route element={<RequireAuth />}>
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/organizations/register" element={<OrganizationRegister />} />
                <Route path="/organizations/manage" element={<OrganizationManage />} />
                <Route path="/organizations/:organizationId/jobs/new" element={<JobPostWizard />} />
                <Route path="/organizations/:id/team" element={<OrganizationTeam />} />
                <Route path="/organizations/:id/settings" element={<OrganizationSettings />} />
                <Route path="/jobs/:id/apply" element={<JobApply />} />
                <Route path="/jobs/:id/cbt" element={<JobCbt />} />
                <Route path="/organizations/jobs/:id/applicants" element={<JobApplicants />} />
                <Route path="/organizations/jobs/:id/applicants/:applicationId" element={<JobApplicantReview />} />
                <Route path="/organizations/jobs/:id/cbt" element={<JobCbtBuilder />} />
                <Route path="/organizations/jobs/:id/interview" element={<JobInterviewBuilder />} />
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
          </Routes></Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
