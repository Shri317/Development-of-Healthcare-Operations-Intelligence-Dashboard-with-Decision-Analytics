import React, { useState } from 'react';
import type { TimeframeOption } from './types';
import { Header } from './components/layout/Header';
import { Sidebar, type ModuleId } from './components/layout/Sidebar';
import { AICopilotDrawer } from './components/copilot/AICopilotDrawer';

// Modules
import { ExecutiveCommandCenter } from './components/modules/ExecutiveCommandCenter';
import { PatientOperations } from './components/modules/PatientOperations';
import { DoctorStaffIntelligence } from './components/modules/DoctorStaffIntelligence';
import { BillingRevenueIntelligence } from './components/modules/BillingRevenueIntelligence';
import { InsuranceClaimsAutomation } from './components/modules/InsuranceClaimsAutomation';
import { MedicalCodingDocumentation } from './components/modules/MedicalCodingDocumentation';
import { PharmacyInventory } from './components/modules/PharmacyInventory';
import { LaboratoryDiagnostics } from './components/modules/LaboratoryDiagnostics';
import { EmergencyCriticalOperations } from './components/modules/EmergencyCriticalOperations';
import { QualityCompliance } from './components/modules/QualityCompliance';
import { PatientExperience } from './components/modules/PatientExperience';
import { SupplyChainVendor } from './components/modules/SupplyChainVendor';
import { FinancialIntelligence } from './components/modules/FinancialIntelligence';

// Modals
import { EnterpriseDrilldownModal } from './components/modals/EnterpriseDrilldownModal';
import { CustomKPIBuilderModal } from './components/modals/CustomKPIBuilderModal';
import { AlertsModal } from './components/modals/AlertsModal';

// Authentication & Security
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthLoadingScreen } from './components/auth/AuthLoadingScreen';
import { AuthErrorScreen } from './components/auth/AuthErrorScreen';

export const MedOpsDashboard: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleId>('executive');
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('realtime');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Drawers & Modals
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState<boolean>(false);
  const [drilldownFacilityId, setDrilldownFacilityId] = useState<string>('all');
  const [isKPIBuilderOpen, setIsKPIBuilderOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);

  // Notification Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleExecuteAction = (actionId: string, payload?: any) => {
    let actionDesc = `Action logged: ${actionId}`;
    if (actionId === 'run-athena-query') {
      actionDesc = `Executed SQL Query on AWS Athena via AWS Glue Data Catalog (ID: ${payload?.queryExecutionId || 'active'})`;
    } else if (actionId === 'pipeline-verification-requested') {
      actionDesc = 'Verified Closed-Loop Data Pipeline Status with Backend Services';
    } else if (actionId === 'workflow-rule-evaluated') {
      actionDesc = `Evaluated Workflow Rule "${payload?.ruleId || ''}" against Live Dataset (${payload?.triggeredCount ?? 0} matches)`;
    } else if (actionId === 'export-analytics-pdf' || actionId === 'export-powerbi-pdf') {
      actionDesc = `Generated ${payload?.report || 'Operations'} Digest Document`;
    } else if (actionId === 'export-analytics-excel' || actionId === 'export-powerbi-excel') {
      actionDesc = `Exported ${payload?.report || 'Operations'} Data to Spreadsheet`;
    } else if (actionId === 'refresh-analytics-dataset' || actionId === 'refresh-powerbi-dataset') {
      actionDesc = 'Refreshed Operational Metrics Model';
    }

    triggerToast(actionDesc);
  };

  const handleOpenDrilldown = (facId: string) => {
    setDrilldownFacilityId(facId);
    setIsDrilldownOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#252525] text-[#F9FAFB] flex flex-col font-sans selection:bg-[#22D3EE] selection:text-[#1E1E1E]">
      {/* Action Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#2D2D2D] border border-[#22D3EE] text-[#F9FAFB] px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* Global Application Header */}
      <Header
        selectedFacility={selectedFacility}
        onFacilityChange={setSelectedFacility}
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={setSelectedTimeframe}
        onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
        isCopilotOpen={isCopilotOpen}
      />

      {/* Main Layout Area */}
      <div className="flex flex-1 relative">
        {/* Navigation Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={(id) => setActiveModule(id)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Dynamic Module Content View */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-full bg-[#252525] text-[#D1D5DB]">
          {activeModule === 'executive' && (
            <ExecutiveCommandCenter
              selectedFacility={selectedFacility}
              selectedTimeframe={selectedTimeframe}
              onOpenDrilldown={handleOpenDrilldown}
              onExecuteAction={handleExecuteAction}
            />
          )}

          {activeModule === 'patient-ops' && (
            <PatientOperations selectedFacility={selectedFacility} selectedTimeframe={selectedTimeframe} onExecuteAction={handleExecuteAction} />
          )}

          {activeModule === 'staff-intel' && (
            <DoctorStaffIntelligence selectedFacility={selectedFacility} selectedTimeframe={selectedTimeframe} onExecuteAction={handleExecuteAction} />
          )}

          {activeModule === 'billing-rev' && (
            <BillingRevenueIntelligence selectedFacility={selectedFacility} selectedTimeframe={selectedTimeframe} onExecuteAction={handleExecuteAction} />
          )}

          {activeModule === 'claims-auto' && (
            <InsuranceClaimsAutomation selectedFacility={selectedFacility} selectedTimeframe={selectedTimeframe} onExecuteAction={handleExecuteAction} />
          )}

          {activeModule === 'coding-doc' && (
            <MedicalCodingDocumentation
              selectedFacility={selectedFacility}
              selectedTimeframe={selectedTimeframe}
              onExecuteAction={handleExecuteAction}
            />
          )}

          {activeModule === 'pharmacy-inv' && (
            <PharmacyInventory selectedFacility={selectedFacility} selectedTimeframe={selectedTimeframe} onExecuteAction={handleExecuteAction} />
          )}

          {activeModule === 'lab-diag' && (
            <LaboratoryDiagnostics selectedFacility={selectedFacility} selectedTimeframe={selectedTimeframe} onExecuteAction={handleExecuteAction} />
          )}

          {activeModule === 'emergency-ops' && (
            <EmergencyCriticalOperations
              selectedFacility={selectedFacility}
              selectedTimeframe={selectedTimeframe}
              onExecuteAction={handleExecuteAction}
            />
          )}

          {activeModule === 'quality-compliance' && (
            <QualityCompliance
              selectedFacility={selectedFacility}
              selectedTimeframe={selectedTimeframe}
              onExecuteAction={handleExecuteAction}
            />
          )}

          {activeModule === 'patient-exp' && (
            <PatientExperience
              selectedFacility={selectedFacility}
              selectedTimeframe={selectedTimeframe}
              onExecuteAction={handleExecuteAction}
            />
          )}

          {activeModule === 'supply-chain' && (
            <SupplyChainVendor
              selectedFacility={selectedFacility}
              selectedTimeframe={selectedTimeframe}
              onExecuteAction={handleExecuteAction}
            />
          )}

          {activeModule === 'financial-intel' && (
            <FinancialIntelligence
              selectedFacility={selectedFacility}
              selectedTimeframe={selectedTimeframe}
              onExecuteAction={handleExecuteAction}
            />
          )}
        </main>
      </div>

      {/* Slide-over AI Agent Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        selectedFacility={selectedFacility}
        onExecuteAction={handleExecuteAction}
      />

      {/* Drill-down Matrix Modal */}
      <EnterpriseDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        initialFacilityId={drilldownFacilityId}
        selectedTimeframe={selectedTimeframe}
      />

      {/* KPI Builder Modal */}
      <CustomKPIBuilderModal
        isOpen={isKPIBuilderOpen}
        onClose={() => setIsKPIBuilderOpen(false)}
      />

      {/* Live Alerts Notification Drawer Modal */}
      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
      />
    </div>
  );
};

/**
 * Enterprise Authentication Gatekeeper for Amazon Cognito
 */
const MedOpsAuthGuard: React.FC = () => {
  const { isAuthenticated, isLoading, error, login } = useAuth();

  if (isLoading) {
    return (
      <AuthLoadingScreen 
        message="Verifying Healthcare Operations Credentials..." 
        subMessage="Resolving Amazon Cognito OIDC session (us-east-1)..."
      />
    );
  }

  if (error) {
    return <AuthErrorScreen error={error} onRetry={login} />;
  }

  if (!isAuthenticated) {
    return (
      <AuthLoadingScreen 
        message="Redirecting to AWS Cognito Managed Login..." 
        subMessage="Launching secure single sign-on authentication portal..."
      />
    );
  }

  // Authenticated: Render complete MedOps command center
  return <MedOpsDashboard />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MedOpsAuthGuard />
    </AuthProvider>
  );
};

export default App;
