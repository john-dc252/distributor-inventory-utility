import {HashRouter, Navigate, Route} from "@solidjs/router";
import Layout from "./components/Layout";
import AccountsPage from "./pages/AccountsPage";
import ItemsPage from "./pages/ItemsPage";
import CustomersPage from "./pages/CustomersPage";
import TransactionsPage from "./pages/TransactionsPage";
import TemplatesPage from "./pages/TemplatesPage";
import {loadStoredData} from "./store";

export default function App() {
  loadStoredData();

  return (
    <HashRouter root={Layout}>
      <Route path="/" component={AccountsPage}/>
      <Route path="/items" component={ItemsPage}/>
      <Route path="/customers" component={CustomersPage}/>
      <Route path="/transactions" component={TransactionsPage}/>
      <Route path="/templates" component={TemplatesPage}/>
      <Route path="/*" component={() => (<Navigate href="/"/>)}/>
    </HashRouter>
  );
}
