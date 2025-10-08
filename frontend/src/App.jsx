import Fantasy from './components/layouts/Fantasy';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Fantasy />
      </div>
    </AuthProvider>
  );
}

export default App;