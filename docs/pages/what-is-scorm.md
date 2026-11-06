---
title: "What is SCORM? A practical guide for training teams"
url: https://oshascorm.org/pages/what-is-scorm
description: "What a SCORM file and package are, SCORM 1.2 vs SCORM 2004, xAPI and cmi5, what “SCORM-compliant” means, and how to upload a SCORM package to your LMS."
updated: 2026-11-06
---

# What is SCORM? A practical guide for training teams

> What a SCORM file and package are, SCORM 1.2 vs SCORM 2004, xAPI and cmi5, what “SCORM-compliant” means, and how to upload a SCORM package to your LMS.

SCORM is the standard that lets one online course run, and report results, in almost any learning management system. Here’s what it is, how SCORM packages work, and which version to choose.

## What is SCORM?

**SCORM (Sharable Content Object Reference Model)** is a set of technical standards for eLearning, published by the Advanced Distributed Learning (ADL) Initiative of the U.S. Department of Defense. It defines how online training content is packaged and how it communicates with a **learning management system (LMS)**.

Because SCORM is the de facto interoperability standard, a course built to the specification can be uploaded to Moodle, Cornerstone, TalentLMS, Canvas, Absorb, Docebo and hundreds of other platforms — and it will report completion, scores and time spent the same way in each one. SCORM is purely technical: it says nothing about instructional design or content quality.

## What is a SCORM file (SCORM package)?

A **SCORM package** is a single .zip file. At its root is an XML file called imsmanifest.xml that describes the course structure, its launchable units (called SCOs, or Sharable Content Objects) and every file the course needs. The rest of the ZIP holds the HTML, JavaScript, video, images and quiz logic.

- **Packaging:** the manifest tells the LMS what to import and which page to launch.
- **Run-time communication:** when a learner opens the course, its JavaScript finds the LMS’s SCORM API and reports progress — status, score, bookmark location and interactions.
- **Sequencing (SCORM 2004 only):** rules that control the order in which learners move through multiple SCOs.

Every OSHASCORM.org course is delivered this way: you receive a SCORM 1.2 or SCORM 2004 ZIP and upload it as-is — do not unzip it first.

## SCORM 1.2 vs SCORM 2004: which should you use?

Both versions are widely used. SCORM 1.2 (2001) is the most broadly supported; SCORM 2004 (latest: 4th Edition, 2009) adds richer tracking and sequencing.

| Feature | SCORM 1.2 | SCORM 2004 (4th Ed.) |
| --- | --- | --- |
| LMS support | Near-universal | Most modern LMSs |
| Status tracking | One field: cmi.core.lesson_status (passed, failed, completed, incomplete…) | Separate completion (cmi.completion_status) and success (cmi.success_status) |
| Bookmark / suspend data | 4,096 characters | 64,000 characters |
| Sequencing & navigation rules | No | Yes |
| Interaction (quiz answer) detail | Basic | Richer, with descriptions and learner responses |

**Rule of thumb:** choose SCORM 2004 if your LMS supports it, because it reports completion and pass/fail independently. Choose SCORM 1.2 for older or lightweight platforms. Not sure? Download our free sample SCORM 1.2 package from any course page and test it in your LMS first.

## xAPI vs SCORM (and where cmi5 fits)

**xAPI** (Experience API, also called Tin Can, released by ADL in 2013) records learning as simple “actor–verb–object” statements sent to a Learning Record Store (LRS). It can track learning outside a browser or LMS — simulations, mobile apps, on-the-job tasks.

**SCORM** runs inside a browser session launched by an LMS and tracks a defined set of data. For assigning and tracking compliance courses inside an LMS, SCORM remains the most compatible choice.

**cmi5** is a profile of xAPI that adds LMS launch and packaging rules — effectively “xAPI with SCORM-style structure.” It is growing, but SCORM support is still far more universal across LMS platforms.

## What does “SCORM-compliant” mean?

A **SCORM-compliant course** is packaged and communicates exactly as the specification requires, so any conformant LMS can import, launch and track it. A **SCORM-compliant LMS** can import SCORM packages, provide the run-time API, and store the data courses send (status, score, time, bookmarks).

Most LMS platforms support SCORM 1.2, and most also support SCORM 2004. Before you buy, check which versions your LMS supports — or test our free sample package. Tools such as SCORM Cloud can also be used to verify how a package behaves.

## How to upload a SCORM package to your LMS

1. **Download** the SCORM ZIP we email after purchase. Keep it zipped.
2. In your LMS, **create a new course or activity** and choose the SCORM / “eLearning package” content type.
3. **Upload the ZIP.** The LMS reads imsmanifest.xml and imports the course.
4. **Set completion rules** — for example, require a passing score on the final exam.
5. **Enroll or assign learners**, then track progress, scores and certificates in your LMS reports.

Need help? Our support team assists with installation at no charge for one year from purchase — call 1-866-429-6742 or email info@oshascorm.org.

## SCORM FAQ

### What does SCORM stand for?

SCORM stands for Sharable Content Object Reference Model — a set of eLearning standards published by the Advanced Distributed Learning (ADL) Initiative.

### Is a SCORM file just a ZIP file?

Yes. A SCORM package is a ZIP file containing an imsmanifest.xml manifest at its root plus the course’s HTML, JavaScript and media. Upload the ZIP to your LMS without extracting it.

### Is SCORM 2004 better than SCORM 1.2?

SCORM 2004 tracks more data and separates completion from pass/fail, but SCORM 1.2 is supported by more platforms. Use SCORM 2004 if your LMS supports it, otherwise SCORM 1.2.

### Will SCORM courses work on mobile devices?

Yes. Our SCORM courses are HTML5-based and run in modern desktop and mobile browsers through any LMS that supports mobile delivery.
