import { useState } from "react";
import ConnectionCard from "../components/ConnectionCard";
import MappingReview from "../components/MappingReview";
import MigrationProgress from "../components/MigrationProgress";
import StepIndicator, { type WizardStep } from "../components/StepIndicator";
import type { ConnectionState } from "../types";

export default function MigrationPage() {
    const [source, setSource] = useState<ConnectionState | null>(null);
    const [destination, setDestination] = useState<ConnectionState | null>(null);
    const [step, setStep] = useState<WizardStep>("connect");
    const [projectId, setProjectId] = useState<number | null>(null);

    const bothConnected = Boolean(source && destination);

    return (
        <div>
            <StepIndicator step={step} />

            {step === "connect" && (
                <>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <ConnectionCard label="Source database" connection={source} onConnected={setSource} />
                        <ConnectionCard
                            label="Destination database"
                            connection={destination}
                            onConnected={setDestination}
                        />
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            disabled={!bothConnected}
                            onClick={() => setStep("mapping")}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                            Continue to Mapping
                        </button>
                    </div>
                </>
            )}

            {step === "mapping" && source && destination && (
                <MappingReview
                    source={source}
                    destination={destination}
                    onProjectCreated={(id) => {
                        setProjectId(id);
                        setStep("migrate");
                    }}
                />
            )}

            {step === "migrate" && source && destination && projectId && (
                <MigrationProgress projectId={projectId} source={source} destination={destination} />
            )}
        </div>
    );
}
