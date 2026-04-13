import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreateGame from './components/CreateGame';
import JoinGame from './components/JoinGame';
import Home from './components/Home';
import InstructionsPage from './components/InstructionsPage';
import CharactersPage from './components/CharactersPage';
import './styles/sovereign-ledger.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/create" element={<CreateGame />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/rules" element={<InstructionsPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
