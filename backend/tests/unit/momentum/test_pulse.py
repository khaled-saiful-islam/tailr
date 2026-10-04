from __future__ import annotations

from app.modules.momentum.pulse import PulseJob, pulse


def job(
    company: str = "Selat Pay",
    *,
    skills: tuple[str, ...] = ("Python",),
    low: int | None = None,
    high: int | None = None,
    mode: str | None = "hybrid",
    score: int = 75,
) -> PulseJob:
    return PulseJob(
        company=company, work_mode=mode, salary_min=low, salary_max=high, skills=skills, score=score
    )


def test_needs_a_few_jobs() -> None:
    assert pulse([job(), job()], lambda s: True) is None


def test_skills_pay_modes_and_companies() -> None:
    jobs = [
        job(skills=("Python", "Kubernetes"), low=6000, high=9000, score=82),
        job("Rimba", skills=("python", "SQL"), low=7000, high=10000, mode="remote"),
        job(skills=("Python", "Kubernetes"), low=6500, high=None, score=55),
        job("Kopi Labs", skills=("Go",), mode=None, score=40),
    ]
    result = pulse(jobs, lambda skill: skill.casefold() == "python")
    assert result is not None
    assert result.jobs == 4
    assert result.good_fit == 2
    top = result.skills[0]
    assert (top.name, top.jobs, top.share, top.have) == ("Python", 3, 75, True)
    assert result.skills[1].name == "Kubernetes"
    assert not result.skills[1].have
    assert result.pay is not None
    assert (result.pay.low, result.pay.high, result.pay.jobs) == (6500, 9000, 3)
    assert result.modes == {"hybrid": 2, "remote": 1, "unknown": 1}
    assert result.companies[0] == ("Selat Pay", 2)


def test_one_off_skills_are_not_demand_and_pay_needs_three_ads() -> None:
    jobs = [job(skills=("Python",)) for _ in range(5)] + [job(skills=("COBOL",), low=5000)]
    result = pulse(jobs, lambda skill: False)
    assert result is not None
    assert [skill.name for skill in result.skills] == ["Python"]
    assert result.pay is None
