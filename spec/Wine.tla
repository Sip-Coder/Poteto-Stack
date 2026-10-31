------------------------------ MODULE Wine ------------------------------
\* One lot of red grapes, from the vine to the glass.
\* A Sip Studies cellar a student can walk: harvest, crush and destem,
\* ferment, press, age in oak or steel, bottle, pour.
\* FermentDays and BottleCount stay small so TLC can draw every state.
\*
\* The BottleIsFinished changes nothing. It exists so the poured glass
\* is a real end, not a deadlock. The statechart view hides that stutter.

EXTENDS Integers

CONSTANT FermentDays, BottleCount

VARIABLES place, vessel, day, left, bottledOnce
vars == <<place, vessel, day, left, bottledOnce>>

Places == {"vine", "basket", "must", "ferment", "pressed", "cellar", "bottled", "glass"}
Vessels == {"none", "oak", "steel"}

TypeOK ==
  /\ place \in Places
  /\ vessel \in Vessels
  /\ day \in 0..FermentDays
  /\ left \in 0..BottleCount
  /\ bottledOnce \in BOOLEAN

Init ==
  /\ place = "vine"
  /\ vessel = "none"
  /\ day = 0
  /\ left = 0
  /\ bottledOnce = FALSE

YouSnip ==
  /\ place = "vine"
  /\ place' = "basket"
  /\ UNCHANGED <<vessel, day, left, bottledOnce>>

YouCrush ==
  /\ place = "basket"
  /\ place' = "must"
  /\ UNCHANGED <<vessel, day, left, bottledOnce>>

YouSealTheVat ==
  /\ place = "must"
  /\ place' = "ferment"
  /\ day' = 0
  /\ UNCHANGED <<vessel, left, bottledOnce>>

ADayPasses ==
  /\ place = "ferment"
  /\ day < FermentDays
  /\ day' = day + 1
  /\ UNCHANGED <<place, vessel, left, bottledOnce>>

YouPress ==
  /\ place = "ferment"
  /\ day = FermentDays
  /\ place' = "pressed"
  /\ UNCHANGED <<vessel, day, left, bottledOnce>>

YouRackIntoOak ==
  /\ place = "pressed"
  /\ vessel = "none"
  /\ place' = "cellar"
  /\ vessel' = "oak"
  /\ UNCHANGED <<day, left, bottledOnce>>

YouRackIntoSteel ==
  /\ place = "pressed"
  /\ vessel = "none"
  /\ place' = "cellar"
  /\ vessel' = "steel"
  /\ UNCHANGED <<day, left, bottledOnce>>

YouBottle ==
  /\ place = "cellar"
  /\ vessel \in {"oak", "steel"}
  /\ day = FermentDays
  /\ place' = "bottled"
  /\ left' = BottleCount
  /\ bottledOnce' = TRUE
  /\ UNCHANGED <<vessel, day>>

YouPour ==
  /\ place = "bottled"
  /\ left > 0
  /\ left' = left - 1
  /\ place' = IF left = 1 THEN "glass" ELSE "bottled"
  /\ UNCHANGED <<vessel, day, bottledOnce>>

\* End stutter. True only when the glass has been poured, and it changes nothing.
TheBottleIsFinished ==
  /\ place = "glass"
  /\ UNCHANGED vars

Next ==
  \/ YouSnip
  \/ YouCrush
  \/ YouSealTheVat
  \/ ADayPasses
  \/ YouPress
  \/ YouRackIntoOak
  \/ YouRackIntoSteel
  \/ YouBottle
  \/ YouPour
  \/ TheBottleIsFinished

Spec == Init /\ [][Next]_vars

\* You cannot hold a bottle, or a poured glass, before fermentation finishes.
NoBottleBeforeFerment ==
  place \in {"bottled", "glass"} => day = FermentDays

\* Bottled means some wine is left. The glass means the last pour emptied the bottle.
\* Before bottling there is nothing to serve.
NoServeEmpty ==
  /\ (place = "bottled" => left > 0)
  /\ (place = "glass" => left = 0)
  /\ (place \notin {"bottled", "glass"} => left = 0)

\* Once the lot is bottled it never returns to the crusher, or to any earlier place.
NoCrushAfterBottle ==
  bottledOnce => place \in {"bottled", "glass"}

\* The press, the cellar, and the bottle only happen after fermentation finishes.
FermentBeforePress ==
  place \in {"pressed", "cellar", "bottled", "glass"} => day = FermentDays

\* Oak and steel are a fork. One vessel, chosen at racking, never both, never early.
OneVessel ==
  /\ place \in {"vine", "basket", "must", "ferment", "pressed"} => vessel = "none"
  /\ place \in {"cellar", "bottled", "glass"} => vessel \in {"oak", "steel"}

=============================================================================
