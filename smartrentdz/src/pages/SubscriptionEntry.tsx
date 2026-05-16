import Subscription from "./Subscription";
import SubscriptionPage from "./SubscriptionPage";
import { useAuth } from "@/contexts/AuthContext";

const SubscriptionEntry = () => {
  const { userData } = useAuth();

  // Landlords/owners use the landlord subscription flow.
  const isLandlord = userData?.type === "landlord" || userData?.account_type === "owner";

  return isLandlord ? <Subscription /> : <SubscriptionPage />;
};

export default SubscriptionEntry;
