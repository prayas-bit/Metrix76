from app.schemas.metrology import AccuracyClass, InstrumentMeta, SanityCheckResult

class InstrumentSanityEngine:
    @staticmethod
    def validate_spec(spec: InstrumentMeta) -> SanityCheckResult:
        issues = []
        
        if spec.scale_interval_d <= 0:
            issues.append("Scale interval 'd' must be greater than 0.")
        if spec.verification_interval_e <= 0:
            issues.append("Verification interval 'e' must be greater than 0.")
        if spec.max_capacity <= 0:
            issues.append("Maximum capacity 'Max' must be greater than 0.")

        if issues:
            return SanityCheckResult(
                is_valid=False,
                calculated_n=0,
                n_min=0,
                n_max=None,
                min_capacity_required=0.0,
                issues=issues
            )

        # 1. Scale interval relationship: e >= d
        if spec.verification_interval_e < spec.scale_interval_d:
            issues.append(f"Verification interval e ({spec.verification_interval_e}) cannot be less than scale interval d ({spec.scale_interval_d}).")

        # 2. Number of scale intervals n = Max / e
        n = int(round(spec.max_capacity / spec.verification_interval_e))

        n_min = 0
        n_max = None
        min_e_multiplier = 20

        if spec.accuracy_class == AccuracyClass.CLASS_I:
            n_min = 50000
            n_max = None
            min_e_multiplier = 100
            if n < n_min:
                issues.append(f"Class I instruments must have at least {n_min:,} scale intervals (calculated: {n:,}).")

        elif spec.accuracy_class == AccuracyClass.CLASS_II:
            n_min = 100
            n_max = 100000
            min_e_multiplier = 50
            if n < n_min or n > n_max:
                issues.append(f"Class II instruments must have between {n_min:,} and {n_max:,} intervals (calculated: {n:,}).")

        elif spec.accuracy_class == AccuracyClass.CLASS_III:
            n_min = 500
            n_max = 10000
            min_e_multiplier = 20
            if n < n_min or n > n_max:
                issues.append(f"Class III instruments must have between {n_min:,} and {n_max:,} intervals (calculated: {n:,}).")

        elif spec.accuracy_class == AccuracyClass.CLASS_IIII:
            n_min = 100
            n_max = 1000
            min_e_multiplier = 10
            if n < n_min or n > n_max:
                issues.append(f"Class IIII instruments must have between {n_min:,} and {n_max:,} intervals (calculated: {n:,}).")

        # 3. Minimum Capacity threshold
        min_cap_req = min_e_multiplier * spec.verification_interval_e
        if spec.min_capacity < min_cap_req - 1e-9:
            issues.append(f"Minimum capacity ({spec.min_capacity} {spec.unit}) is below statutory threshold ({min_cap_req:.4f} {spec.unit} = {min_e_multiplier}e).")

        return SanityCheckResult(
            is_valid=len(issues) == 0,
            calculated_n=n,
            n_min=n_min,
            n_max=n_max,
            min_capacity_required=round(min_cap_req, 5),
            issues=issues
        )
