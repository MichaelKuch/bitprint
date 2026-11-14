import { Component } from 'react';

import Context, {
  initialContext,
  type AppContext,
  type AppState,
  type FileInfo,
  type SetContext,
  type VaultData
} from './context';

import Header from './components/Header';
import Intro from './components/Intro';
import Print from './components/Print';
import Footer from './components/Footer';

import './index.css';

export default class App extends Component<object, AppContext> {
  // Must be declared before `state`, which references it
  setContext: SetContext = (newContext, callback) => {
    // setState merges, so only the changed keys are needed
    this.setState(newContext as AppState, callback);
  };

  state: AppContext = { ...initialContext, setContext: this.setContext };

  demoData = async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}demo.json`);
    const data: VaultData = await response.json();
    const foldersToPrint = data.folders.map(({ id }) => id);

    const file: FileInfo = {
      name: 'demo.json',
      lastModified: 1576401686010,
      size: 15941
    };

    this.setState({ data, file, foldersToPrint });
  };

  componentDidMount() {
    if (window.location.search.includes('demo')) {
      this.demoData();
    }
  }

  render() {
    return (
      <Context.Provider value={this.state}>
        <main className="font-body leading-relaxed min-h-screen flex flex-col">
          <Header />
          <Intro />
          <Print />
          <Footer />
        </main>
      </Context.Provider>
    );
  }
}
