<script lang="ts">
  import { base } from '$app/paths';
</script>

<!-- One decorative surface for every popup. The container measures the actual
     dialog width so the crest and corners always scale together. -->
<span class="dialog-frame" aria-hidden="true" style:--frame-art={`url("${base}/assets/ui/chronicle-tray.webp")`}></span>

<style>
  .dialog-frame{position:absolute;inset:0;z-index:-1;pointer-events:none;container-type:size;}
  .dialog-frame::before{content:'';position:absolute;inset:0;z-index:1;border:1px solid transparent;border-image:var(--frame-art) 360 64 350 64 / 23.4375cqw 4.166667cqw 22.7865cqw stretch;}
  .dialog-frame::after{content:'';position:absolute;inset:9.2cqw 3.2cqw 6.2cqw;background:linear-gradient(#07132155,#07132155),var(--frame-art) center / auto 160% no-repeat #071321;}
  :global(dialog.framed-dialog.framed-dialog){border:0;border-radius:0;background:none;box-shadow:none;isolation:isolate;color:#f5dfac;}
  :global(dialog.framed-dialog.framed-dialog:not(.public-table)){padding:90px var(--frame-inline-padding,48px) 64px;}
  :global(dialog.framed-dialog.framed-dialog:not(.public-table) > .close){top:58px;right:5%;}
  :global(dialog.framed-dialog.framed-dialog::backdrop){background:#020811bb;backdrop-filter:none;}
  @media(max-aspect-ratio:3/4){
    :global(dialog.framed-dialog.framed-dialog:not(.public-table)){padding:55px 24px 35px;}
    :global(dialog.framed-dialog.framed-dialog:not(.public-table) > .close){top:38px;}
  }
</style>
