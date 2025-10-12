import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayrollManagerModule", (m) => {
  const payroll = m.contract("PayrollManager");

  return { payroll };
});