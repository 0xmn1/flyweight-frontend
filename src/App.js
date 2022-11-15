import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <main>
      <h1>New order</h1>
      <div>
        Swap
        <input type="text" placeholder="token in amount" />
        <select id="token-in-symbol">
          <option value="UNI">UNI</option>
        </select>
        for
        <select id="token-out-symbol">
          <option value="WETH">WETH</option>
        </select>
        when price is
      </div>
      <div>
        <select id="order-trigger-direction">
          <option value="above">above</option>
          <option value="equal">equal to</option>
          <option value="below">below</option>
        </select>
      </div>
      <div>
        <input type="text" placeholder="trigger price for token in" />
        <button type="button">Add order to smart contract</button>
      </div>
    </main>
  );
}

export default App;
