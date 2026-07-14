import { useState } from "react";
import ConnectionCard from "../components/ConnectionCard";
import MappingReview from "../components/MappingReview";
import ValidationReport from "../components/ValidationReport";
import MigrationProgress from "../components/MigrationProgress";
import StepIndicator, { type WizardStep } from "../components/StepIndicator";
import Button from "../components/ui/Button";
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
                        <ConnectionCard label="Source database" connection={source} onConnected={setSource} allowCsv />
                        <ConnectionCard
                            label="Destination database"
                            connection={destination}
                            onConnected={setDestination}
                        />
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button disabled={!bothConnected} onClick={() => setStep("mapping")}>
                            Continue to Mapping
                        </Button>
                    </div>
                </>
            )}

            {step === "mapping" && source && destination && (
                <MappingReview
                    source={source}
                    destination={destination}
                    onProjectCreated={(id) => {
                        setProjectId(id);
                        setStep("validate");
                    }}
                />
            )}

            {step === "validate" && source && destination && projectId && (
                <ValidationReport
                    projectId={projectId}
                    source={source}
                    destination={destination}
                    onBack={() => setStep("mapping")}
                    onContinue={() => setStep("migrate")}
                />
            )}

            {step === "migrate" && source && destination && projectId && (
                <MigrationProgress projectId={projectId} source={source} destination={destination} />
            )}
        </div>
    );
}
