import { createElement, Component, render } from 'preact';
import { compose } from 'recompose';
import { withIntl } from '../../enhancers';
import style from './style';
import { Button } from '@zimbra-client/blocks';
import { ActionMenuGroup, ActionMenuItem, NestedActionMenuItem, ModalDialog } from '@zimbra-client/components';
import { gql } from '@apollo/client';
import { useState, useCallback, useMemo, useContext } from 'preact/hooks';
import { Text, IntlProvider, Localizer, IntlContext } from 'preact-i18n';

function createMore(props, context) {
    const childIcon = (
        <span class={style.appIcon}>
        </span>);

    const { intl } = useContext(IntlContext);
    const zimletStrings = intl.dictionary['zimbra-zimlet-bigbluebutton'];

    const { zimbraBatchClient } = context;
    const zimletProperties = new Map();
    const client = context.getApolloClient();

    //this gql query is used to get all current saved Zimlet properties for all Zimlets for the current user from the server
    const zimletProps = gql`
          query AccountInfo {
              accountInfo {
                  id
                  props {
                      prop {
                          zimlet
                          name
                          _content
                      }
                  }
              } 
          }`;

    client.query({
        query: zimletProps, fetchPolicy: "network-only"
    }).then((response) => {
        if (response.data.accountInfo.props.prop) {
            //Filter out the test-zimlet properties, excluding all other Zimlets
            //add all our properties to an ES6 Map
            const propArray = response.data.accountInfo.props.prop;
            for (var i = 0; i < propArray.length; i++) {
                //using legacy/classic UI Zimlet properties for backwards compatibility
                if ((propArray[i].zimlet == "tk_barrydegraaff_bigbluebutton") && (propArray[i].__typename == "Prop")) {
                    zimletProperties.set(propArray[i].name, propArray[i]._content);
                }
            }
        }
    })

    const addMeetingDetails = (e) => {
        let moderatorPassword = zimletProperties.get('bigbluebutton_moderator_password');
        let attendeePassword = zimletProperties.get('bigbluebutton_attendee_password');
        if (!moderatorPassword) {
            moderatorPassword = pwgen();
        }
        if (!attendeePassword) {
            attendeePassword = pwgen();
        }
        let xhr = new XMLHttpRequest();
        let hostname;
        if(context.zimbraOrigin)
        {
           hostname = context.zimbraOrigin;
        }
        else
        {
           hostname = 'https://' + parent.window.location.hostname;
        }
        //removing https:// from hostname here as to avoid having to change Classic UI Zimlet
        xhr.open("GET", context.zimbraOrigin + '/service/extension/bigbluebutton?action=getNewMeetingId&attendeePassword=' + attendeePassword + '&moderatorPassword=' + moderatorPassword +'&hostname='+hostname.replace('https://',''), true);
        xhr.send();
        xhr.onreadystatechange = function (oEvent) {
            var meetingId = "";
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        meetingId = xhr.response;
                    }
                    catch (err) {
                    }
                }

                if (meetingId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i)) {
                    let meetinglink = hostname + '/service/extension/bigbluebutton?meetingId=' + meetingId;
                    //handleLocationChange is a method passed (via props) to the Zimlet slot that allows you to set the location of the appointment
                    props.handleLocationChange({ value: [meetinglink] });

                    let message = zimletStrings.Meeting_Message;
                    message = message.replace('[meetinglink]', meetinglink);
                    message = message.replace('[passwordattendeePassword]', attendeePassword);

                    //Use dispatch/setEvent to set the notes field of the appointment.
                    const { dispatch } = context.store;
                    const { setEvent } = context.zimletRedux.actions.calendar;

                    //props.notes (is a prop passed via the Zimlet slot) that holds the content of the notes field (at the time the user clicks the Zimlet button)
                    //It may have user added content.
                    //With setEvent the developer can append/prepend or replace (to) the users notes.

                    //props.tabId is a prop that holds the Id of the current UI tab (it is also visible in the address bar of the browser, 
                    //https://example.com/calendar/event/new?tabid=1599042149583)

                    //to set the notes field:
                    dispatch(
                        setEvent({
                            tabId: props.tabId,
                            eventData: {
                                notes: message + ' ' + props.notes,
                                isFormDirty: true
                            }
                        })
                    );
                    handleClose();
                }
                else {
                    alert(zimletStrings.fail);
                }
            }
        }
    }

    //copied from classic Zimlet
    const BigBlueButtonHandler = () => {
        var currentContent = props.notes;
        var matches = currentContent.match(/(http.*)([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
        if (matches) {
            matches[0] = matches[0].replace('"', " ");
            matches = matches[0].split(" ");
            window.open(matches[0]);
        }
        else {
            addMeetingDetails();
        }
    }

    const pwgen = () => {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
        let pass = "";

        for (let x = 0; x < 8; x++) {
            let i = Math.floor(Math.random() * 62);
            pass += chars.charAt(i);
        }
        return pass;
    }

    //Dialog to ask user BigBlueButton attendee/moderator password
    const showDialog = () => {
        let moderatorPassword = zimletProperties.get('bigbluebutton_moderator_password');
        let attendeePassword = zimletProperties.get('bigbluebutton_attendee_password');
        if (!moderatorPassword) {
            moderatorPassword = pwgen();
        }
        if (!attendeePassword) {
            attendeePassword = pwgen();
        }
        const modal = (
            <ModalDialog
                class={style.modalDialog}
                contentClass={style.modalContent}
                innerClass={style.inner}
                onClose={this.handleClose}
                cancelButton={false}
                header={false}
                footer={false}
            >
                <header class="zimbra-client_modal-dialog_header"><button onClick={handleClose} aria-label="Close" class="zimbra-client_close-button_close zimbra-client_modal-dialog_actionButton"><span role="img" class="zimbra-icon zimbra-icon-close blocks_icon_md"></span></button></header>
                <div class="zimbra-client_modal-dialog_content zimbra-client_language-modal_languageModalContent">
                    <div class={style.appLogo}>&nbsp;</div><br /><br />
                    {zimletStrings.default_passwords}<br /><br /><table>
                        <tr><td>{zimletStrings.moderator_password} :</td><td><input id="bigbluebutton_moderator_password" type="text" autofocus="" value={moderatorPassword} class="zimbra-client_text-input_input zimbra-client_text-input_wide" /></td></tr>
                        <tr><td>{zimletStrings.attendee_password} :</td><td><input id="bigbluebutton_attendee_password" type="text" autofocus="" value={attendeePassword} class="zimbra-client_text-input_input zimbra-client_text-input_wide" /></td></tr>
                        <tr><td>{zimletStrings.set_defaults} :<br/><br/></td><td><input id="set_defaults" type="checkbox" autofocus="" class="blocks_choice-input_choiceInputContainer" /></td></tr>
                    </table></div>
                <footer class="zimbra-client_modal-dialog_footer"><Button onClick={handleSave} styleType="primary" brand="primary">OK</Button></footer>
            </ModalDialog>
        );

        const { dispatch } = context.store;
        dispatch(context.zimletRedux.actions.zimlets.addModal({ id: 'addEventModal', modal: modal }));
    }

    const handleClose = e => {
        const { dispatch } = context.store;
        dispatch(context.zimletRedux.actions.zimlets.addModal({ id: 'addEventModal' }));
    }

    //This shows a toaster message/notification to the user, used in case there are errors calling Google Translates
    alert = (message) => {
        const { dispatch } = context.store;
        dispatch(context.zimletRedux.actions.notifications.notify({
            message: message
        }));
    }

    //Set bigbluebutton attendee/moderator_password on meeting and store to ldap if set-default option is checked
    const handleSave = e => {
        const attendeePassword = window.parent.document.getElementById('bigbluebutton_attendee_password').value;
        const moderatorPassword = window.parent.document.getElementById('bigbluebutton_moderator_password').value;
        const set_defaults = window.parent.document.getElementById('set_defaults').checked;

        if (!moderatorPassword) {
            alert(zimletStrings.passwordRequired);
            return;
        }
        if (!attendeePassword) {
            alert(zimletStrings.passwordRequired);
            return;
        }

        //Update Zimlet User Properties cache in the Zimlet Context 
        zimletProperties.set('bigbluebutton_attendee_password', attendeePassword);
        zimletProperties.set('bigbluebutton_moderator_password', moderatorPassword);

        if (set_defaults) {
            //The gql mutation that stores to ldap zimbraZimletUserProperties on the server
            const myMutationGql = gql`
               mutation myMutation($props: [PropertiesInput!]) {
                   modifyProps(props: $props)
               }`;

            //Use the Apollo client directly to run the query, save prop1 on the server
            client.mutate({
                mutation: myMutationGql,
                variables: {
                    props: [
                        {
                            zimlet: "tk_barrydegraaff_bigbluebutton",
                            name: 'bigbluebutton_attendee_password',
                            _content: attendeePassword
                        },
                        {
                            zimlet: "tk_barrydegraaff_bigbluebutton",
                            name: 'bigbluebutton_moderator_password',
                            _content: moderatorPassword
                        }
                    ]
                }
            });
        }

        const { dispatch } = context.store;
        dispatch(context.zimletRedux.actions.zimlets.addModal({ id: 'addEventModal' }));
    }


    return (
        <NestedActionMenuItem
            anchor="bottom"
            icon={childIcon}
            position="right"
            title={zimletStrings.title}
        >
            <ActionMenuGroup>
                <ActionMenuItem onClick={BigBlueButtonHandler}>
                    <Text id={`zimbra-zimlet-bigbluebutton.joinHostMeeting`} />
                </ActionMenuItem>
                <ActionMenuItem onClick={BigBlueButtonHandler}>
                    <Text id={`zimbra-zimlet-bigbluebutton.addMeetingDetails`} />
                </ActionMenuItem>
                <ActionMenuItem onClick={showDialog}>
                    <Text id={`zimbra-zimlet-bigbluebutton.preferences`} />
                </ActionMenuItem>
            </ActionMenuGroup>
        </NestedActionMenuItem>
    );

}

//By using compose from recompose we can apply internationalization to our Zimlet
//https://blog.logrocket.com/using-recompose-to-write-clean-higher-order-components-3019a6daf44c/
export default compose(
    withIntl()
)
    (
        createMore
    )
