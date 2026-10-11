/* A small engineering package for the "Try the sample set" button.
 *
 * Invented for the demo -- the project, numbers and documents are not a real
 * client's. It carries six planted problems, the kind the deck lists: an
 * outdated revision, two missing documents, a standard in two editions, a
 * breaker count that differs between the specification and the drawing, and
 * a short-circuit rating that differs between the Design Basis and the
 * specification.
 */
export const SAMPLE_SET = [
  {
    name: "DB-EL-001 Design Basis.pdf",
    pages: [
      `Document No: DB-EL-001    Revision: Rev 3
Project: Sample substation 110/20 kV
Title: Electrical Design Basis

1. Purpose
This Design Basis sets the limits and margins every electrical document in the package must follow.

2. Applicable standards
IEC 60364-5-52:2009 Selection and erection of wiring systems
IEC 61439-1:2020 Low-voltage switchgear assemblies
IEC 60076-1:2011 Power transformers`,
      `3. System parameters
Nominal voltage: 20 kV
Frequency: 50 Hz
Short-circuit current: 25 kA
Ambient temperature: 40 °C

4. Related documents
SPEC-EL-012 Rev 2   Switchgear specification
DWG-EL-104 Rev 1    Single-line diagram
PHIL-EL-002 Rev 1   Protection philosophy`,
    ],
  },
  {
    name: "SPEC-EL-012 Switchgear Specification.docx",
    pages: [
      `Document No: SPEC-EL-012    Revision: Rev 2
Title: Technical Specification, 20 kV Switchgear

1. Design inputs
Design inputs are taken from DB-EL-001 Rev 2.
Assemblies shall comply with IEC 61439-1:2011 and IEC 60364-5-52:2009.

2. Ratings
Nominal voltage: 20 kV
Short-circuit current: 31.5 kA
Ambient temperature: 40 °C

3. Scope of supply
20 x circuit breaker, withdrawable
4 x current transformer
1 x control panel

4. Layout
Arrangement as shown on DWG-EL-104 Rev 1.`,
    ],
  },
  {
    name: "DWG-EL-104 Single-line diagram.pdf",
    pages: [
      `Drawing No: DWG-EL-104    Revision: Rev 1
Title: Single-line diagram, 20 kV switchgear

Equipment shown
19 x circuit breaker
4 x current transformer

Notes
1. Ratings per DB-EL-001 Rev 3.
2. Cable routing per CAB-EL-220 Rev 0.
3. Equipment per SPEC-EL-012 Rev 2.
Frequency: 50 Hz`,
    ],
  },
];
